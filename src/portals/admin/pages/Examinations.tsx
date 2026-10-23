import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const RESULT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function useList(path: string, key: string, params?: Record<string, unknown>) {
  return useQuery({ queryKey: [key, params], queryFn: async () => (await api.get(path, { params })).data.data });
}

function idOf(x: any): string | undefined {
  if (!x) return undefined;
  return typeof x === "string" ? x : x._id;
}

/** Mirrors the backend's assertSubjectApplicableToClass rule: a subject tagged to an academic
 *  group is restricted to that group's classes; one with a direct applicableClasses list is
 *  restricted to those; one with neither applies to every class. */
function isSubjectApplicableToClass(subject: any, classId: string | undefined, groupsById: Map<string, any>): boolean {
  if (!classId) return true;
  if (subject.groupId) {
    const group = groupsById.get(subject.groupId);
    return Boolean(group?.classIds?.some((c: any) => (c._id ?? c) === classId));
  }
  if (subject.applicableClasses?.length) {
    return subject.applicableClasses.some((c: any) => (c._id ?? c) === classId);
  }
  return true;
}

function CreateExamCard({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const { data: classes } = useList("/classes", "classes");
  const { data: subjects } = useList("/subjects", "subjects");
  const { data: groups } = useList("/academic-groups", "academic-groups");
  const { data: years } = useList("/academic-years", "years");
  const groupsById = new Map<string, any>((groups ?? []).map((g: any) => [g._id, g]));

  const [name, setName] = useState("");
  const [examType, setExamType] = useState("midterm");
  const [classId, setClassId] = useState<string>();
  const [subjectRows, setSubjectRows] = useState<{ subjectId: string; maxMarks: string; passMarks: string }[]>([
    { subjectId: "", maxMarks: "100", passMarks: "33" },
  ]);

  useEffect(() => {
    setSubjectRows((rows) =>
      rows.map((r) => {
        const subject = (subjects ?? []).find((s: any) => s._id === r.subjectId);
        return subject && !isSubjectApplicableToClass(subject, classId, groupsById) ? { ...r, subjectId: "" } : r;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const create = useMutation({
    mutationFn: async () =>
      api.post("/examinations", {
        name,
        examType,
        classId,
        academicYearId: years?.find((y: any) => y.isActive)?._id,
        subjects: subjectRows
          .filter((r) => r.subjectId)
          .map((r) => ({ subjectId: r.subjectId, maxMarks: Number(r.maxMarks), passMarks: Number(r.passMarks) })),
      }),
    onSuccess: () => {
      toast({ title: "Examination created" });
      setName("");
      setSubjectRows([{ subjectId: "", maxMarks: "100", passMarks: "33" }]);
      onCreated();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">New Examination</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Name (e.g. Midterm 2026)" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["midterm", "final", "class_test", "term"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>{(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {classId && (subjects ?? []).filter((s: any) => isSubjectApplicableToClass(s, classId, groupsById)).length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            No subjects are configured for this class yet. Add one in Academics → Subjects.
          </p>
        )}
        <div className="space-y-2">
          {subjectRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Select value={row.subjectId} onValueChange={(v) => setSubjectRows((rows) => rows.map((r, j) => (j === i ? { ...r, subjectId: v } : r)))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {(subjects ?? [])
                    .filter((s: any) => isSubjectApplicableToClass(s, classId, groupsById))
                    .map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="w-20"
                placeholder="Max"
                value={row.maxMarks}
                onChange={(e) => setSubjectRows((rows) => rows.map((r, j) => (j === i ? { ...r, maxMarks: e.target.value } : r)))}
              />
              <Input
                className="w-20"
                placeholder="Pass"
                value={row.passMarks}
                onChange={(e) => setSubjectRows((rows) => rows.map((r, j) => (j === i ? { ...r, passMarks: e.target.value } : r)))}
              />
              <Button variant="ghost" size="icon" onClick={() => setSubjectRows((rows) => rows.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setSubjectRows((rows) => [...rows, { subjectId: "", maxMarks: "100", passMarks: "33" }])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
          </Button>
        </div>

        <Button className="w-full" onClick={() => create.mutate()} disabled={!name || !classId || create.isPending}>
          Create Examination
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Approvals, grouped by exam so a whole class can be approved/published  */
/* in one click instead of one row at a time.                             */
/* ---------------------------------------------------------------------- */

function RejectInline({ onReject }: { onReject: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50 shrink-0" onClick={() => setOpen(true)}>
        Reject
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Input
        autoFocus
        placeholder="Reason…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-7 w-36 text-xs"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
        disabled={!reason.trim()}
        onClick={() => {
          onReject(reason.trim());
          setOpen(false);
          setReason("");
        }}
      >
        Confirm
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function ExamGroup({
  examLabel,
  rows,
  primaryLabel,
  onPrimary,
  renderRowAction,
}: {
  examLabel: string;
  rows: any[];
  primaryLabel: string;
  onPrimary: (ids: string[]) => void;
  renderRowAction?: (r: any) => React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 border-b">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{examLabel}</p>
          <p className="text-xs text-gray-400">{rows.length} result{rows.length === 1 ? "" : "s"}</p>
        </div>
        <Button size="sm" onClick={() => onPrimary(rows.map((r) => r._id))} className="shrink-0">
          {primaryLabel} ({rows.length})
        </Button>
      </div>
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r._id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
            <span className="min-w-0 truncate">
              {r.studentId?.firstName} {r.studentId?.lastName} · {r.subjectId?.name} · {r.marksObtained}
            </span>
            {renderRowAction?.(r)}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByExam(results: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const r of results) {
    const key = idOf(r.examinationId);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return map;
}

function ResultsApprovalCard({ examinations }: { examinations: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: submitted = [] } = useQuery({
    queryKey: ["results-submitted"],
    queryFn: async () => (await api.get("/examinations/results/all", { params: { status: "submitted" } })).data.data,
  });
  const { data: approved = [] } = useQuery({
    queryKey: ["results-approved"],
    queryFn: async () => (await api.get("/examinations/results/all", { params: { status: "approved" } })).data.data,
  });

  const act = useMutation({
    mutationFn: async ({ action, resultIds, reason }: { action: "approve" | "reject" | "publish"; resultIds: string[]; reason?: string }) =>
      api.post(`/examinations/results/${action}`, { resultIds, reason }),
    onSuccess: (_res, variables) => {
      const verb = variables.action === "reject" ? "rejected" : variables.action === "publish" ? "published" : "approved";
      toast({ title: `${variables.resultIds.length} result${variables.resultIds.length === 1 ? "" : "s"} ${verb}` });
      qc.invalidateQueries({ queryKey: ["results-submitted"] });
      qc.invalidateQueries({ queryKey: ["results-approved"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const examLabel = (examId: string) => {
    const e = examinations.find((x) => x._id === examId);
    return e ? `${e.name} · ${e.classId?.name ?? "Unknown class"}` : "Examination";
  };

  const submittedGroups = groupByExam(submitted);
  const approvedGroups = groupByExam(approved);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approval</CardTitle>
          <p className="text-xs text-gray-400">Grouped by exam — approve a whole class at once, or reject individual results.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {submittedGroups.size ? (
            [...submittedGroups.entries()].map(([examId, rows]) => (
              <ExamGroup
                key={examId}
                examLabel={examLabel(examId)}
                rows={rows}
                primaryLabel="Approve All"
                onPrimary={(ids) => act.mutate({ action: "approve", resultIds: ids })}
                renderRowAction={(r) => <RejectInline onReject={(reason) => act.mutate({ action: "reject", resultIds: [r._id], reason })} />}
              />
            ))
          ) : (
            <EmptyState icon={GraduationCap} title="Nothing pending approval" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved — Ready to Publish</CardTitle>
          <p className="text-xs text-gray-400">Publish a whole exam's results in one click.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvedGroups.size ? (
            [...approvedGroups.entries()].map(([examId, rows]) => (
              <ExamGroup
                key={examId}
                examLabel={examLabel(examId)}
                rows={rows}
                primaryLabel="Publish All"
                onPrimary={(ids) => act.mutate({ action: "publish", resultIds: ids })}
              />
            ))
          ) : (
            <EmptyState icon={GraduationCap} title="Nothing approved yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Class result sheet — every student x every subject for one exam, at a  */
/* glance, so a class's results don't have to be pieced together by hand. */
/* ---------------------------------------------------------------------- */

function ResultSheetDialog({ exam, onOpenChange }: { exam: any | null; onOpenChange: (open: boolean) => void }) {
  const classId = exam?.classId?._id ?? exam?.classId;

  const { data: roster } = useQuery({
    queryKey: ["result-sheet-roster", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/roster`)).data.data,
  });
  const { data: results } = useQuery({
    queryKey: ["result-sheet-results", exam?._id],
    enabled: Boolean(exam),
    queryFn: async () => (await api.get("/examinations/results/all", { params: { examinationId: exam._id } })).data.data,
  });

  const resultsByCell = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of results ?? []) {
      map.set(`${idOf(r.studentId)}:${idOf(r.subjectId)}`, r);
    }
    return map;
  }, [results]);

  const subjects: any[] = exam?.subjects ?? [];

  return (
    <Dialog open={Boolean(exam)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exam?.name} <span className="text-gray-400 font-normal">· {exam?.classId?.name} · Class Result Sheet</span>
          </DialogTitle>
        </DialogHeader>

        {!roster || !results ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading…</p>
        ) : roster.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No students enrolled in this class yet" />
        ) : subjects.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No subjects configured for this examination" />
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wide border-b">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  {subjects.map((s) => (
                    <th key={idOf(s.subjectId)} className="py-2 px-2 text-center font-medium whitespace-nowrap">
                      {s.subjectId?.name ?? "Subject"}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center font-medium">Total</th>
                  <th className="py-2 pl-2 text-center font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s: any) => {
                  let total = 0;
                  let maxTotal = 0;
                  let enteredCount = 0;
                  let allPassed = true;
                  const cells = subjects.map((sub) => {
                    const subId = idOf(sub.subjectId);
                    const r = resultsByCell.get(`${s._id}:${subId}`);
                    maxTotal += sub.maxMarks;
                    if (r) {
                      total += r.marksObtained;
                      enteredCount++;
                      if (r.marksObtained < sub.passMarks) allPassed = false;
                    }
                    return { subId, r };
                  });
                  const pct = enteredCount > 0 && maxTotal > 0 ? Math.round((total / maxTotal) * 1000) / 10 : null;
                  return (
                    <tr key={s._id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {s.rollNumber ? `${s.rollNumber}. ` : ""}
                        {s.firstName} {s.lastName}
                        {s.sectionId?.name && <span className="text-gray-400 text-xs"> · {s.sectionId.name}</span>}
                      </td>
                      {cells.map(({ subId, r }) => (
                        <td key={subId} className="py-2 px-2 text-center">
                          {r ? (
                            <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${RESULT_STATUS_STYLES[r.status] ?? ""}`}>
                              {r.marksObtained}
                              {r.status !== "published" ? ` · ${r.status}` : ""}
                            </Badge>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center text-xs text-gray-600 whitespace-nowrap">
                        {enteredCount > 0 ? `${total}/${maxTotal} (${pct}%)` : "—"}
                      </td>
                      <td className="py-2 pl-2 text-center">
                        {enteredCount === 0 ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : enteredCount < subjects.length ? (
                          <Badge variant="outline" className="text-[10px]">Partial</Badge>
                        ) : (
                          <Badge variant="secondary" className={`text-[10px] ${allPassed ? "text-emerald-700" : "text-red-700"}`}>
                            {allPassed ? "Pass" : "Fail"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Examinations() {
  const qc = useQueryClient();
  const { data: examinations = [] } = useQuery({
    queryKey: ["all-examinations"],
    queryFn: async () => (await api.get("/examinations")).data.data,
  });
  const [viewExam, setViewExam] = useState<any | null>(null);

  return (
    <div>
      <PageHeader title="Examinations & Results" description="Schedule examinations, approve a class's results in one click, then publish." />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <CreateExamCard onCreated={() => qc.invalidateQueries({ queryKey: ["all-examinations"] })} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduled Examinations</CardTitle>
              <p className="text-xs text-gray-400">Click one to see the full class result sheet.</p>
            </CardHeader>
            <CardContent className="p-0">
              {examinations.length ? (
                <div className="divide-y">
                  {examinations.map((e: any) => (
                    <button
                      key={e._id}
                      onClick={() => setViewExam(e)}
                      className="flex items-center justify-between p-3 text-sm w-full text-left hover:bg-gray-50 transition-colors"
                    >
                      <span>{e.name} · {e.classId?.name}</span>
                      <Badge variant="outline" className="capitalize">{e.status}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={GraduationCap} title="No examinations yet" />
              )}
            </CardContent>
          </Card>
        </div>
        <ResultsApprovalCard examinations={examinations} />
      </div>

      <ResultSheetDialog exam={viewExam} onOpenChange={(open) => !open && setViewExam(null)} />
    </div>
  );
}
