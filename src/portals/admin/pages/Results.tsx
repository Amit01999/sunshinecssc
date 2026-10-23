import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";

const RESULT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function Results() {
  const [academicYearId, setAcademicYearId] = useState<string>(ALL);
  const [classId, setClassId] = useState<string>(ALL);
  const [examinationId, setExaminationId] = useState<string>(ALL);
  const [subjectId, setSubjectId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const { data: years = [] } = useQuery({
    queryKey: ["years"],
    queryFn: async () => (await api.get("/academic-years")).data.data,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes-for-results", academicYearId],
    queryFn: async () =>
      (await api.get("/classes", { params: { academicYearId: academicYearId === ALL ? undefined : academicYearId } })).data.data,
  });
  const { data: examinations = [] } = useQuery({
    queryKey: ["examinations-for-results", classId, academicYearId],
    queryFn: async () =>
      (
        await api.get("/examinations", {
          params: {
            classId: classId === ALL ? undefined : classId,
            academicYearId: academicYearId === ALL ? undefined : academicYearId,
          },
        })
      ).data.data,
  });

  const examination = examinations.find((e: any) => e._id === examinationId);
  const subjectOptions = (examination?.subjects ?? []).filter((s: any) => s.subjectId);

  // Cascading filters - picking a broader one invalidates anything narrower that was chosen.
  useEffect(() => {
    setClassId(ALL);
    setExaminationId(ALL);
    setSubjectId(ALL);
  }, [academicYearId]);
  useEffect(() => {
    setExaminationId(ALL);
    setSubjectId(ALL);
  }, [classId]);
  useEffect(() => {
    setSubjectId(ALL);
  }, [examinationId]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["admin-results", academicYearId, classId, examinationId, subjectId, status],
    queryFn: async () =>
      (
        await api.get("/examinations/results/all", {
          params: {
            academicYearId: academicYearId === ALL ? undefined : academicYearId,
            classId: classId === ALL ? undefined : classId,
            examinationId: examinationId === ALL ? undefined : examinationId,
            subjectId: subjectId === ALL ? undefined : subjectId,
            status: status === ALL ? undefined : status,
          },
        })
      ).data.data,
  });

  const filtered = results.filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${r.studentId?.firstName ?? ""} ${r.studentId?.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || (r.studentId?.studentCode ?? "").toLowerCase().includes(q);
  });

  const counts = {
    total: filtered.length,
    draft: filtered.filter((r: any) => r.status === "draft").length,
    submitted: filtered.filter((r: any) => r.status === "submitted").length,
    approved: filtered.filter((r: any) => r.status === "approved").length,
    published: filtered.filter((r: any) => r.status === "published").length,
  };

  return (
    <div>
      <PageHeader title="Results" description="Browse exam results across every class, academic year, and examination." />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[170px]">
            <Label className="text-xs text-gray-500 mb-1 block">Academic Year</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All years</SelectItem>
                {years.map((y: any) => (
                  <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Label className="text-xs text-gray-500 mb-1 block">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {classes.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[190px]">
            <Label className="text-xs text-gray-500 mb-1 block">Examination</Label>
            <Select value={examinationId} onValueChange={setExaminationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All examinations</SelectItem>
                {examinations.map((e: any) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Label className="text-xs text-gray-500 mb-1 block">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!examination}>
              <SelectTrigger><SelectValue placeholder={examination ? undefined : "Pick an exam first"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {subjectOptions.map((s: any) => (
                  <SelectItem key={s.subjectId._id} value={s.subjectId._id}>{s.subjectId.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {["draft", "submitted", "approved", "published", "rejected"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-gray-500 mb-1 block">Search student</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Name or student ID…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Results" value={counts.total} icon={FileCheck2} />
        <StatCard label="Draft" value={counts.draft} icon={FileCheck2} />
        <StatCard label="Awaiting Approval" value={counts.submitted} icon={FileCheck2} />
        <StatCard label="Approved" value={counts.approved} icon={FileCheck2} />
        <StatCard label="Published" value={counts.published} icon={FileCheck2} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Loading…</p>
          ) : filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Examination</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      {r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName}` : "Unknown student"}
                      <span className="text-gray-400 text-xs block">{r.studentId?.studentCode ?? ""}</span>
                    </TableCell>
                    <TableCell className="text-gray-500">{r.examinationId?.classId?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{r.examinationId?.academicYearId?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{r.examinationId?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{r.subjectId?.name ?? "—"}</TableCell>
                    <TableCell className="font-medium text-gray-700">{r.marksObtained}</TableCell>
                    <TableCell>{r.grade ? <Badge variant="secondary" className="text-[10px]">{r.grade}</Badge> : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[10px] ${RESULT_STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={FileCheck2} title="No results match these filters" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
