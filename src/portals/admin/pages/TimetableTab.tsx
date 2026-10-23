import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Layers, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A small, fixed palette of literal Tailwind classes (Tailwind's compiler needs the full
// class names present in source - not built from a template string) so each subject gets a
// consistent, subtle color without any manual setup.
const SUBJECT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", dot: "bg-purple-500" },
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-800", dot: "bg-pink-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", dot: "bg-cyan-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500" },
];

function colorForSubject(subjectId: string) {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) hash = (hash * 31 + subjectId.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

interface TeachingAssignment {
  _id: string;
  // Populated refs resolve to null if the referenced subject/teacher was deleted elsewhere.
  subjectId: { _id: string; name: string } | null;
  teacherId: { _id: string; firstName: string; lastName: string } | null;
}

interface TimetableSlot {
  _id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  room?: string;
  isPublished: boolean;
  subjectId: { _id: string; name: string } | null;
  teacherId: { _id: string; firstName: string; lastName: string } | null;
}

/** Add (possibly multi-day) or edit (single slot) a period. Shared so the two flows stay in sync. */
function ScheduleDialog({
  open,
  onOpenChange,
  academicYearId,
  classId,
  sectionId,
  teachingAssignments,
  editingSlot,
  defaultDay,
  defaultPeriod,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId?: string;
  classId: string;
  sectionId: string;
  teachingAssignments: TeachingAssignment[];
  editingSlot?: TimetableSlot | null;
  defaultDay?: number;
  defaultPeriod?: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(editingSlot);
  // Assignments whose subject or teacher has since been deleted populate as null — exclude them
  // rather than crash; they're removed from "Teaching Assignments" too once that's cleaned up.
  const validAssignments = useMemo(
    () => teachingAssignments.filter((a): a is TeachingAssignment & { subjectId: NonNullable<TeachingAssignment["subjectId"]>; teacherId: NonNullable<TeachingAssignment["teacherId"]> } => Boolean(a.subjectId && a.teacherId)),
    [teachingAssignments],
  );

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [singleDay, setSingleDay] = useState(0);
  const [periodIndex, setPeriodIndex] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [assignmentPair, setAssignmentPair] = useState<string>();
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editingSlot) {
      setSingleDay(editingSlot.dayOfWeek);
      setPeriodIndex(String(editingSlot.periodIndex));
      setStartTime(editingSlot.startTime);
      setEndTime(editingSlot.endTime);
      setAssignmentPair(
        editingSlot.subjectId && editingSlot.teacherId
          ? `${editingSlot.subjectId._id}|${editingSlot.teacherId._id}`
          : undefined,
      );
      setRoom(editingSlot.room ?? "");
      setSelectedDays([]);
    } else {
      setSelectedDays(defaultDay !== undefined ? [defaultDay] : []);
      setSingleDay(0);
      setPeriodIndex(defaultPeriod !== undefined ? String(defaultPeriod) : "1");
      setStartTime("");
      setEndTime("");
      setAssignmentPair(undefined);
      setRoom("");
    }
  }, [open, editingSlot, defaultDay, defaultPeriod]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const save = useMutation({
    mutationFn: async () => {
      const [subjectId, teacherId] = (assignmentPair ?? "").split("|");
      const common = {
        periodIndex: Number(periodIndex),
        startTime,
        endTime,
        subjectId,
        teacherId,
        room: room || undefined,
      };

      if (isEdit) {
        return api.patch(`/timetable/${editingSlot!._id}`, { ...common, dayOfWeek: singleDay });
      }

      const results = await Promise.allSettled(
        selectedDays.map((dayOfWeek) => api.post("/timetable", { academicYearId, classId, sectionId, dayOfWeek, ...common })),
      );
      const failed = results
        .map((r, i) => (r.status === "rejected" ? { day: DAYS[selectedDays[i]], error: r.reason } : null))
        .filter((x): x is { day: string; error: unknown } => x !== null);
      return { succeeded: results.length - failed.length, failed };
    },
    onSuccess: (result) => {
      if (isEdit) {
        toast({ title: "Period updated" });
        onOpenChange(false);
      } else {
        const { succeeded, failed } = result as { succeeded: number; failed: { day: string; error: unknown }[] };
        if (succeeded > 0) {
          toast({ title: `Added period for ${succeeded} day${succeeded === 1 ? "" : "s"}` });
        }
        if (failed.length > 0) {
          toast({
            title: `Could not add for ${failed.map((f) => f.day).join(", ")}`,
            description: getErrorMessage(failed[0].error),
            variant: "destructive",
          });
        }
        if (failed.length === 0) onOpenChange(false);
      }
      onSaved();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/timetable/${editingSlot!._id}`),
    onSuccess: () => {
      toast({ title: "Period removed" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const canSave = isEdit
    ? Boolean(startTime && endTime && assignmentPair)
    : Boolean(selectedDays.length > 0 && startTime && endTime && assignmentPair);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Period" : "Add Schedule"}</DialogTitle>
        </DialogHeader>

        {validAssignments.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            No teacher is assigned to this class/section yet. Add one in the "Teaching Assignments" tab first.
          </p>
        ) : (
          <div className="space-y-3">
            {isEdit ? (
              <div>
                <Label>Day of week</Label>
                <Select value={String(singleDay)} onValueChange={(v) => setSingleDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_FULL.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Day(s) of week — pick more than one to repeat this same period across days</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedDays.includes(i)
                          ? "text-white border-transparent"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                      style={selectedDays.includes(i) ? { backgroundColor: "hsl(208,89%,40%)" } : undefined}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Period # — the slot's position in the day (1st period, 2nd period…), not the clock time</Label>
              <Input type="number" min={0} placeholder="e.g. 1" value={periodIndex} onChange={(e) => setPeriodIndex(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Subject — Teacher</Label>
              <Select value={assignmentPair} onValueChange={setAssignmentPair}>
                <SelectTrigger><SelectValue placeholder="Select subject and teacher" /></SelectTrigger>
                <SelectContent>
                  {validAssignments.map((a) => (
                    <SelectItem key={a._id} value={`${a.subjectId._id}|${a.teacherId._id}`}>
                      {a.subjectId.name} — {a.teacherId.firstName} {a.teacherId.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Room (optional)</Label>
              <Input placeholder="e.g. Room 204" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              {isEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this period?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes it from the timetable immediately for anyone it was already published to.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate()}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button className="flex-1" onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
                {save.isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save Changes"
                    : selectedDays.length > 1
                      ? `Add to ${selectedDays.length} Days`
                      : "Add Schedule"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TimetableTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data });
  const { data: years } = useQuery({ queryKey: ["years"], queryFn: async () => (await api.get("/academic-years")).data.data });

  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const [academicYearId, setAcademicYearId] = useState<string>();
  const [dialogState, setDialogState] = useState<null | { editingSlot?: TimetableSlot; defaultDay?: number; defaultPeriod?: number }>(null);

  useEffect(() => {
    if (!academicYearId && years?.length) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [years, academicYearId]);

  const selectedClass = classes?.find((c: any) => c._id === classId);

  const { data: sections } = useQuery({
    queryKey: ["sections-for-timetable", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });

  // Reset the section when switching classes, then default to the first one once loaded -
  // the admin always has an immediate, valid view instead of landing on an empty picker.
  useEffect(() => {
    setSectionId(undefined);
  }, [classId]);
  useEffect(() => {
    if (!sectionId && sections?.length) setSectionId(sections[0]._id);
  }, [sections, sectionId]);

  const selectedSection = sections?.find((s: any) => s._id === sectionId);

  const { data: teachingAssignments = [] } = useQuery<TeachingAssignment[]>({
    queryKey: ["assignments-for-timetable", classId, sectionId],
    enabled: Boolean(classId && sectionId),
    queryFn: async () => (await api.get("/teaching-assignments", { params: { classId, sectionId } })).data.data,
  });

  const slotsKey = ["timetable-slots", classId, sectionId];
  const { data: slots, isLoading: slotsLoading } = useQuery<TimetableSlot[]>({
    queryKey: slotsKey,
    enabled: Boolean(classId && sectionId),
    queryFn: async () => (await api.get("/timetable", { params: { classId, sectionId } })).data.data,
  });

  const publish = useMutation({
    mutationFn: async () => api.post(`/timetable/classes/${classId}/publish`, null, { params: { sectionId } }),
    onSuccess: () => {
      toast({ title: "Timetable published", description: "Visible to this section's students, parents, and assigned teachers now." });
      qc.invalidateQueries({ queryKey: slotsKey });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const periodRows = useMemo(() => Array.from(new Set((slots ?? []).map((s) => s.periodIndex))).sort((a, b) => a - b), [slots]);
  const slotAt = (day: number, period: number) => slots?.find((s) => s.dayOfWeek === day && s.periodIndex === period);
  const hasUnpublished = (slots ?? []).some((s) => !s.isPublished);
  const refreshSlots = () => qc.invalidateQueries({ queryKey: slotsKey });

  const lastPeriod = periodRows.length > 0 ? periodRows[periodRows.length - 1] : 0;
  const openAdd = (day?: number, period?: number) => setDialogState({ defaultDay: day, defaultPeriod: period ?? lastPeriod + 1 });
  const openEdit = (slot: TimetableSlot) => setDialogState({ editingSlot: slot });

  return (
    <div className="space-y-4">
      {/* Class + section selection, always visible */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <Label className="text-xs text-gray-500 mb-1.5 block">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>{(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {classId && sectionId && (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={() => publish.mutate()}
                disabled={!slots?.length || publish.isPending}
              >
                {publish.isPending ? "Publishing…" : hasUnpublished ? "Publish Timetable" : "Re-publish"}
              </Button>
            )}
          </div>

          {classId && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-xs text-gray-500">Section</Label>
                {sections && (
                  <Badge variant="secondary" className="text-[10px]">
                    {sections.length} section{sections.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              {sections === undefined ? (
                <p className="text-sm text-gray-400">Loading sections…</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  This class has no sections yet. Add one in the "Classes & Sections" tab.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sections.map((s: any) => (
                    <button
                      key={s._id}
                      onClick={() => setSectionId(s._id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        sectionId === s._id
                          ? "text-white border-transparent"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                      style={sectionId === s._id ? { backgroundColor: "hsl(208,89%,40%)" } : undefined}
                    >
                      Section {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!classId ? (
        <EmptyState icon={Layers} title="Select a class to view or build its timetable" />
      ) : !sectionId ? null : (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4" style={{ color: "hsl(208,89%,40%)" }} />
                <h3 className="font-semibold text-gray-800">
                  {selectedClass?.name} <span className="text-gray-400">·</span> Section {selectedSection?.name}
                </h3>
              </div>
              <Button size="sm" onClick={() => openAdd()}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Schedule
              </Button>
            </div>

            {slotsLoading ? (
              <p className="text-sm text-gray-400 py-10 text-center">Loading timetable…</p>
            ) : periodRows.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No periods scheduled yet"
                description={`Click "Add Schedule" to build ${selectedClass?.name} Section ${selectedSection?.name}'s weekly timetable.`}
              />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <div className="min-w-[860px]">
                  {/* Day header row */}
                  <div className="grid grid-cols-[90px_repeat(7,minmax(110px,1fr))] gap-2 mb-2">
                    <div />
                    {DAYS.map((d) => (
                      <div key={d} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Period rows */}
                  <div className="space-y-2">
                    {periodRows.map((period) => (
                      <div key={period} className="grid grid-cols-[90px_repeat(7,minmax(110px,1fr))] gap-2">
                        <div className="flex items-center justify-center text-xs font-semibold text-gray-500 bg-gray-50 rounded-lg">
                          Period {period}
                        </div>
                        {DAYS.map((_, day) => {
                          const slot = slotAt(day, period);
                          if (!slot) {
                            return (
                              <button
                                key={day}
                                onClick={() => openAdd(day, period)}
                                className="min-h-[72px] rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center"
                                title="Add a period here"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            );
                          }
                          const isBroken = !slot.subjectId || !slot.teacherId;
                          const color = isBroken
                            ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" }
                            : colorForSubject(slot.subjectId._id);
                          return (
                            <button
                              key={day}
                              onClick={() => openEdit(slot)}
                              className={`min-h-[72px] rounded-lg border ${color.bg} ${color.border} p-2 text-left relative group transition-shadow hover:shadow-sm`}
                              title={isBroken ? "This period's subject or teacher was deleted elsewhere — click to remove it." : undefined}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-semibold leading-tight ${color.text}`}>
                                  {isBroken ? "Subject/teacher deleted" : slot.subjectId.name}
                                </p>
                                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                              <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3 shrink-0" />
                                {slot.teacherId ? `${slot.teacherId.firstName} ${slot.teacherId.lastName}` : "Unknown teacher"}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {slot.startTime}–{slot.endTime}
                                {slot.room ? ` · ${slot.room}` : ""}
                              </p>
                              {!slot.isPublished && (
                                <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0">
                                  Draft
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {classId && sectionId && (
        <ScheduleDialog
          open={dialogState !== null}
          onOpenChange={(open) => !open && setDialogState(null)}
          academicYearId={academicYearId}
          classId={classId}
          sectionId={sectionId}
          teachingAssignments={teachingAssignments}
          editingSlot={dialogState?.editingSlot}
          defaultDay={dialogState?.defaultDay}
          defaultPeriod={dialogState?.defaultPeriod}
          onSaved={refreshSlots}
        />
      )}
    </div>
  );
}
