import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  AttendanceStatus,
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_STYLES,
} from "@/components/dashboard/AttendanceStatusBadge";
import { AttendanceCalendarLegend, DayAttendance, MonthAttendanceCalendar, dayKey } from "@/components/dashboard/MonthAttendanceCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTeachingAssignments } from "../useTeachingAssignments";
import { AssignmentPicker } from "../AssignmentPicker";

// Mirrors EDIT_WINDOW_DAYS in backend/src/controllers/attendance.controller.ts - a UX hint only;
// the server is the real authority and will reject a locked update regardless of this check.
const EDIT_WINDOW_DAYS = 2;

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  studentCode: string;
}

interface AttendanceRecord {
  _id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  isLocked: boolean;
  updatedAt: string;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function isRecordEditable(r: Pick<AttendanceRecord, "isLocked" | "date">) {
  if (r.isLocked) return false;
  return Date.now() - new Date(r.date).getTime() <= EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function CorrectionDialog({
  open,
  onOpenChange,
  record,
  studentName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: AttendanceRecord | null;
  studentName: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && record) {
      setStatus(record.status);
      setReason("");
    }
  }, [open, record]);

  const submit = useMutation({
    mutationFn: async () => api.post("/attendance/corrections", { attendanceId: record!._id, requestedStatus: status, reason }),
    onSuccess: () => {
      toast({ title: "Correction request sent", description: "An admin will review this change." });
      onOpenChange(false);
      onDone();
    },
    onError: (err) => toast({ title: "Could not submit request", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Correction — {studentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            This record is locked (older than {EDIT_WINDOW_DAYS} days or finalized). Request a correction and an admin
            will review it.
          </p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Requested status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{ATTENDANCE_STATUS_STYLES[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Reason</label>
            <Input placeholder="Why should this change?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={!reason || submit.isPending}>
            {submit.isPending ? "Sending…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: years } = useQuery({ queryKey: ["years"], queryFn: async () => (await api.get("/academic-years")).data.data });
  const { data: assignments = [], isLoading: loadingAssignments } = useTeachingAssignments();

  const [academicYearId, setAcademicYearId] = useState<string>();
  const [assignmentId, setAssignmentId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [correctionStudentName, setCorrectionStudentName] = useState("");

  useEffect(() => {
    if (!academicYearId && years?.length) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [years, academicYearId]);

  const yearAssignments = useMemo(
    () => assignments.filter((a) => !academicYearId || a.academicYearId === academicYearId),
    [assignments, academicYearId],
  );
  useEffect(() => {
    if (assignmentId && !yearAssignments.some((a) => a._id === assignmentId)) setAssignmentId(undefined);
  }, [yearAssignments, assignmentId]);
  const assignment = yearAssignments.find((a) => a._id === assignmentId) ?? yearAssignments[0];

  useEffect(() => {
    if (!sameDay(calendarMonth, selectedDate)) setCalendarMonth(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ["attendance-roster", assignment?.classId?._id, assignment?.sectionId?._id],
    enabled: Boolean(assignment),
    queryFn: async () =>
      (await api.get<{ data: Student[] }>(`/classes/${assignment!.classId._id}/roster`, { params: { sectionId: assignment!.sectionId._id } })).data.data,
  });

  const monthStart = useMemo(() => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), [calendarMonth]);
  const monthEnd = useMemo(() => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59), [calendarMonth]);

  const { data: monthRecords = [], isLoading: loadingRecords, isFetching: fetchingRecords } = useQuery({
    queryKey: ["attendance-month", assignment?.classId?._id, assignment?.sectionId?._id, monthStart.toISOString().slice(0, 7)],
    enabled: Boolean(assignment),
    queryFn: async () =>
      (
        await api.get<{ data: AttendanceRecord[] }>("/attendance", {
          params: {
            classId: assignment!.classId._id,
            sectionId: assignment!.sectionId._id,
            from: monthStart.toISOString(),
            to: monthEnd.toISOString(),
          },
        })
      ).data.data,
  });

  const dayRecords = useMemo(
    () => monthRecords.filter((r) => sameDay(new Date(r.date), selectedDate)),
    [monthRecords, selectedDate],
  );
  const recordByStudent = useMemo(() => new Map(dayRecords.map((r) => [r.studentId, r])), [dayRecords]);

  useEffect(() => {
    if (!roster) return;
    const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    for (const s of roster) {
      const existing = recordByStudent.get(s._id);
      initial[s._id] = { status: existing?.status ?? "present", remarks: existing?.remarks ?? "" };
    }
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, selectedDate, dayRecords.length]);

  const statusByDate = useMemo(() => {
    const map = new Map<string, DayAttendance>();
    for (const r of monthRecords) {
      const key = dayKey(new Date(r.date));
      const entry = map.get(key) ?? { present: 0, absent: 0, late: 0, excused: 0 };
      entry[r.status]++;
      map.set(key, entry);
    }
    return map;
  }, [monthRecords]);

  const filteredRoster = (roster ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q);
  });

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of dayRecords) counts[r.status]++;
  const notRecorded = (roster?.length ?? 0) - dayRecords.length;

  const save = useMutation({
    mutationFn: async () => {
      const editableStudents = (roster ?? []).filter((s) => {
        const existing = recordByStudent.get(s._id);
        return !existing || isRecordEditable(existing);
      });
      const records = editableStudents.map((s) => ({
        studentId: s._id,
        status: draft[s._id]?.status ?? "present",
        remarks: draft[s._id]?.remarks || undefined,
      }));
      return api.post("/attendance", {
        classId: assignment!.classId._id,
        sectionId: assignment!.sectionId._id,
        academicYearId: assignment!.academicYearId,
        date: selectedDate.toISOString(),
        records,
      });
    },
    onSuccess: () => {
      toast({ title: "Attendance saved" });
      qc.invalidateQueries({ queryKey: ["attendance-month"] });
    },
    onError: (err) => toast({ title: "Could not save attendance", description: getErrorMessage(err), variant: "destructive" }),
  });

  const lockedCount = (roster ?? []).filter((s) => {
    const existing = recordByStudent.get(s._id);
    return existing && !isRecordEditable(existing);
  }).length;
  const allLocked = Boolean(roster?.length) && lockedCount === roster!.length;

  const isFuture = selectedDate > startOfDay(new Date());

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description="Review and manage attendance for your assigned classes."
        actions={
          years?.find((y: any) => y._id === academicYearId) ? (
            <Badge variant="outline" className="text-xs font-normal">
              {years.find((y: any) => y._id === academicYearId)?.name}
            </Badge>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Academic year" /></SelectTrigger>
              <SelectContent>
                {(years ?? []).map((y: any) => <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-[220px]">
              <AssignmentPicker assignments={yearAssignments} value={assignment?._id} onChange={setAssignmentId} />
            </div>
          </div>

          {assignment && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 min-w-[220px]">{fmt(selectedDate)}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={isFuture || sameDay(selectedDate, startOfDay(new Date()))}
                onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDate(startOfDay(new Date()))}>
                Today
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!assignment ? (
        <EmptyState
          icon={CalendarCheck}
          title={loadingAssignments ? "Loading your classes…" : "No teaching assignments for this year"}
          description={loadingAssignments ? undefined : "Contact the school administrator if this seems wrong."}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <StatCard label="Total Students" value={roster?.length ?? 0} icon={Users} />
            <StatCard label="Present" value={counts.present} icon={CalendarCheck} />
            <StatCard label="Absent" value={counts.absent} icon={CalendarCheck} />
            <StatCard label="Late" value={counts.late} icon={CalendarCheck} />
            <StatCard label="Excused" value={counts.excused} icon={CalendarCheck} />
            <StatCard label="Not Recorded" value={Math.max(notRecorded, 0)} icon={CalendarCheck} />
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">
                    {assignment.classId.name} {assignment.sectionId.name} · {assignment.subjectId.name}
                  </CardTitle>
                  <div className="relative w-52">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <Input className="pl-8 h-8 text-sm" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {dayRecords.length === 0 && !isFuture && roster?.length ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border-y border-amber-200 px-4 py-2">
                    No attendance recorded yet for this date — students default to Present below. Adjust and save.
                  </p>
                ) : null}
                {isFuture ? (
                  <EmptyState icon={CalendarCheck} title="This date is in the future" description="Attendance can only be recorded for today or a past date." />
                ) : loadingRoster || loadingRecords ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : filteredRoster.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Roll</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-36">Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoster.map((s) => {
                        const existing = recordByStudent.get(s._id);
                        const editable = !existing || isRecordEditable(existing);
                        return (
                          <TableRow key={s._id}>
                            <TableCell className="text-gray-500">{s.rollNumber ?? "—"}</TableCell>
                            <TableCell className="font-medium text-gray-800">{s.firstName} {s.lastName}</TableCell>
                            <TableCell>
                              {editable ? (
                                <Select
                                  value={draft[s._id]?.status ?? "present"}
                                  onValueChange={(v) => setDraft((m) => ({ ...m, [s._id]: { ...m[s._id], status: v as AttendanceStatus } }))}
                                >
                                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ATTENDANCE_STATUSES.map((st) => (
                                      <SelectItem key={st} value={st} className="capitalize">{ATTENDANCE_STATUS_STYLES[st].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="outline" className={ATTENDANCE_STATUS_STYLES[existing!.status].badge}>
                                    {ATTENDANCE_STATUS_STYLES[existing!.status].label}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-[11px] text-gray-500"
                                    onClick={() => { setCorrectionRecord(existing!); setCorrectionStudentName(`${s.firstName} ${s.lastName}`); }}
                                  >
                                    Request correction
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editable ? (
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Optional note…"
                                  value={draft[s._id]?.remarks ?? ""}
                                  onChange={(e) => setDraft((m) => ({ ...m, [s._id]: { ...m[s._id], remarks: e.target.value } }))}
                                />
                              ) : (
                                <span className="text-gray-400 text-xs">{existing?.remarks ?? "—"}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState icon={Users} title={search ? "No students match your search" : "No students in this section"} />
                )}
              </CardContent>
              {!isFuture && roster?.length ? (
                <div className="p-4 border-t flex items-center gap-3">
                  <Button onClick={() => save.mutate()} disabled={allLocked || save.isPending}>
                    {save.isPending ? "Saving…" : "Save Attendance"}
                  </Button>
                  {allLocked && <span className="text-xs text-gray-400">All records for this date are locked.</span>}
                  {!allLocked && lockedCount > 0 && (
                    <span className="text-xs text-gray-400">{lockedCount} record(s) locked — use "Request correction" to change them.</span>
                  )}
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Monthly Overview{fetchingRecords ? " · updating…" : ""}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MonthAttendanceCalendar
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  statusByDate={statusByDate}
                />
                <AttendanceCalendarLegend />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <CorrectionDialog
        open={Boolean(correctionRecord)}
        onOpenChange={(v) => !v && setCorrectionRecord(null)}
        record={correctionRecord}
        studentName={correctionStudentName}
        onDone={() => qc.invalidateQueries({ queryKey: ["attendance-month"] })}
      />
    </div>
  );
}
