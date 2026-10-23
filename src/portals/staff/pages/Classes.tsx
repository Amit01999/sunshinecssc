import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock, FileDown, MapPin, Trash2, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTeachingAssignments } from "../useTeachingAssignments";
import { AssignmentPicker } from "../AssignmentPicker";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface MyTimetableSlot {
  _id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  room?: string;
  isPublished: boolean;
  // A class/section/subject can populate as null if it was deleted elsewhere after this slot was created.
  classId: { _id: string; name: string } | null;
  sectionId: { _id: string; name: string } | null;
  subjectId: { _id: string; name: string } | null;
}

export default function Classes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments = [] } = useTeachingAssignments();
  const [assignmentId, setAssignmentId] = useState<string>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const assignment = assignments.find((a) => a._id === assignmentId) ?? assignments[0];

  const { data: timetable } = useQuery<MyTimetableSlot[]>({
    queryKey: ["my-timetable"],
    queryFn: async () => (await api.get("/timetable")).data.data,
  });

  const todayIndex = new Date().getDay();
  const slotsByDay = useMemo(() => {
    const map = new Map<number, MyTimetableSlot[]>();
    for (const s of timetable ?? []) {
      const list = map.get(s.dayOfWeek) ?? [];
      list.push(s);
      map.set(s.dayOfWeek, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.periodIndex - b.periodIndex);
    return map;
  }, [timetable]);
  const firstDayWithSlots = DAYS.findIndex((_, i) => (slotsByDay.get(i)?.length ?? 0) > 0);
  const [activeDay, setActiveDay] = useState(String(todayIndex));
  const hasAutoPicked = useRef(false);
  useEffect(() => {
    if (!timetable || hasAutoPicked.current) return;
    hasAutoPicked.current = true;
    // Default to today if it has classes, otherwise jump to the first day that does.
    if ((slotsByDay.get(todayIndex)?.length ?? 0) === 0 && firstDayWithSlots >= 0) {
      setActiveDay(String(firstDayWithSlots));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetable]);

  const { data: materials } = useQuery({
    queryKey: ["my-materials", assignment?.subjectId?._id],
    enabled: Boolean(assignment),
    queryFn: async () =>
      (await api.get("/learning-materials", { params: { classId: assignment!.classId._id, subjectId: assignment!.subjectId._id } })).data
        .data,
  });

  const createMaterial = useMutation({
    mutationFn: async () => {
      const res = await api.post("/learning-materials", {
        classId: assignment!.classId._id,
        sectionId: assignment!.sectionId._id,
        subjectId: assignment!.subjectId._id,
        academicYearId: assignment!.academicYearId,
        title,
        description,
      });
      if (file) {
        const form = new FormData();
        form.append("file", file);
        await api.post(`/learning-materials/${res.data.data._id}/files`, form);
      }
    },
    onSuccess: () => {
      toast({ title: "Material published" });
      setTitle("");
      setDescription("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["my-materials"] });
    },
    onError: (err) => toast({ title: "Failed to upload", description: getErrorMessage(err), variant: "destructive" }),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => api.delete(`/learning-materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-materials"] }),
  });

  return (
    <div>
      <PageHeader title="Classes & Learning Materials" description="Your weekly timetable and shared study materials." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">My Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          {timetable?.length ? (
            <Tabs value={activeDay} onValueChange={setActiveDay}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                {DAYS.map((d, i) => {
                  const count = slotsByDay.get(i)?.length ?? 0;
                  return (
                    <TabsTrigger
                      key={i}
                      value={String(i)}
                      disabled={count === 0}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:shadow-none disabled:opacity-40"
                      style={activeDay === String(i) ? { backgroundColor: "hsl(208,89%,40%)" } : undefined}
                    >
                      {d}
                      {i === todayIndex && <span className="text-[9px] uppercase opacity-80">· Today</span>}
                      {count > 0 && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 h-4 ${activeDay === String(i) ? "bg-white/20 text-white" : ""}`}
                        >
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {DAYS.map((d, i) => {
                const daySlots = slotsByDay.get(i) ?? [];
                return (
                  <TabsContent key={i} value={String(i)} className="mt-0">
                    {daySlots.length === 0 ? (
                      <EmptyState icon={BookOpen} title={`No classes on ${DAYS_FULL[i]}`} />
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((s) => (
                          <div key={s._id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3.5">
                            <div className="flex flex-col items-center justify-center w-14 shrink-0 text-center">
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Period</span>
                              <span className="text-lg font-bold text-gray-800">{s.periodIndex}</span>
                            </div>
                            <div className="w-px self-stretch bg-gray-100" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{s.subjectId?.name ?? "Unknown subject"}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {s.classId?.name ?? "—"} {s.sectionId?.name ?? ""}
                                </span>
                                {s.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {s.room}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="flex items-center justify-end gap-1 text-sm font-medium text-gray-700">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {s.startTime}–{s.endTime}
                              </span>
                              {!s.isPublished && (
                                <Badge variant="secondary" className="mt-1 text-[10px]">Draft</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <EmptyState icon={BookOpen} title="No timetable published yet" />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Publish Learning Material</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AssignmentPicker assignments={assignments} value={assignment?._id} onChange={setAssignmentId} />
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <Button onClick={() => createMaterial.mutate()} disabled={!assignment || !title || createMaterial.isPending}>
            Publish
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Published Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {materials?.length ? (
            <div className="space-y-2">
              {materials.map((m: any) => (
                <div key={m._id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {m.files.map((f: any, i: number) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(208,89%,40%)] flex items-center gap-1">
                          <FileDown className="w-3 h-3" /> {f.filename}
                        </a>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMaterial.mutate(m._id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No materials published for this subject yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
