import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileDown } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentScope } from "../useStudentScope";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TimetableSlot {
  _id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  room?: string;
  subjectId?: { name: string };
  teacherId?: { firstName: string; lastName: string };
}

interface Material {
  _id: string;
  title: string;
  description?: string;
  subjectId?: { name: string };
  files: { url: string; filename: string }[];
}

export default function Classes() {
  const { studentId, ready, isParent } = useStudentScope();
  const params = studentId ? { studentId } : {};

  const { data: timetable } = useQuery({
    queryKey: ["timetable", studentId],
    enabled: ready,
    queryFn: async () => (await api.get<{ data: TimetableSlot[] }>("/timetable", { params })).data.data,
  });

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials", studentId],
    enabled: ready,
    queryFn: async () => (await api.get<{ data: Material[] }>("/learning-materials", { params })).data.data,
  });

  if (!ready) return <EmptyState icon={BookOpen} title="Select a child above to view their classes" />;

  return (
    <div>
      <PageHeader
        title={isParent ? "Your Child's Classes" : "Classes & Learning Materials"}
        description={
          isParent
            ? "Your child's weekly timetable and study materials shared by their teachers."
            : "Weekly timetable and study materials shared by your teachers."
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Weekly Timetable</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {timetable && timetable.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetable.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{DAYS[s.dayOfWeek]}</TableCell>
                    <TableCell>{s.startTime}–{s.endTime}</TableCell>
                    <TableCell>{s.subjectId?.name}</TableCell>
                    <TableCell>{s.teacherId ? `${s.teacherId.firstName} ${s.teacherId.lastName}` : "—"}</TableCell>
                    <TableCell>{s.room ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={BookOpen} title="Timetable not published yet" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : materials && materials.length > 0 ? (
            <div className="space-y-3">
              {materials.map((m) => (
                <div key={m._id} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="font-medium text-sm text-gray-800">
                      {m.title} {m.subjectId?.name && <span className="text-gray-400">· {m.subjectId.name}</span>}
                    </p>
                    {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {m.files.map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-[hsl(208,89%,40%)] hover:underline"
                      >
                        <FileDown className="w-3.5 h-3.5" /> {f.filename}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No materials shared yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
