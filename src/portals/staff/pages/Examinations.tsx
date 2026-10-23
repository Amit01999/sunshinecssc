import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, Clock, GraduationCap, Pencil, Search, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTeachingAssignments } from "../useTeachingAssignments";
import { AssignmentPicker } from "../AssignmentPicker";

type Ref<T> = (T & { _id: string }) | string | null | undefined;

function idOf(x: Ref<unknown>): string | undefined {
  if (!x) return undefined;
  return typeof x === "string" ? x : (x as { _id: string })._id;
}

interface ExamSubjectConfig {
  subjectId: Ref<{ name: string }>;
  maxMarks: number;
  passMarks: number;
  examDate?: string;
}

interface ExaminationItem {
  _id: string;
  name: string;
  examType: string;
  status: "scheduled" | "ongoing" | "completed";
  subjects: ExamSubjectConfig[];
}

interface ExamResultItem {
  _id: string;
  studentId: Ref<unknown>;
  subjectId: Ref<unknown>;
  marksObtained: number;
  grade?: string;
  status: "draft" | "submitted" | "approved" | "published" | "rejected";
  rejectedReason?: string;
}

interface RosterStudent {
  _id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  studentCode: string;
}

const EXAM_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  ongoing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const RESULT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function Examinations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: teachingAssignments = [] } = useTeachingAssignments();
  const [assignmentId, setAssignmentId] = useState<string>();
  const [examinationId, setExaminationId] = useState<string>();
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const assignment = teachingAssignments.find((a) => a._id === assignmentId) ?? teachingAssignments[0];

  const { data: examinations = [] } = useQuery<ExaminationItem[]>({
    queryKey: ["examinations-for-class", assignment?.classId?._id],
    enabled: Boolean(assignment),
    queryFn: async () => (await api.get("/examinations", { params: { classId: assignment!.classId._id } })).data.data,
  });

  useEffect(() => {
    if (examinationId && !examinations.some((e) => e._id === examinationId)) setExaminationId(undefined);
  }, [examinations, examinationId]);

  const examination = examinations.find((e) => e._id === examinationId) ?? examinations[0];
  const subjectConfig = examination?.subjects?.find((s) => idOf(s.subjectId) === assignment?.subjectId?._id);

  const { data: students } = useQuery<RosterStudent[]>({
    queryKey: ["roster-for-exam", assignment?.classId?._id, assignment?.sectionId?._id],
    enabled: Boolean(assignment),
    queryFn: async () =>
      (await api.get(`/classes/${assignment!.classId._id}/roster`, { params: { sectionId: assignment!.sectionId._id } })).data.data,
  });

  const { data: existingResults = [] } = useQuery<ExamResultItem[]>({
    queryKey: ["exam-results-entry", examination?._id, assignment?.subjectId?._id],
    enabled: Boolean(examination && assignment),
    queryFn: async () =>
      (
        await api.get("/examinations/results/all", {
          params: { examinationId: examination!._id, subjectId: assignment!.subjectId._id },
        })
      ).data.data,
  });

  const resultByStudent = useMemo(() => {
    const map = new Map<string, ExamResultItem>();
    for (const r of existingResults) {
      const sid = idOf(r.studentId);
      if (sid) map.set(sid, r);
    }
    return map;
  }, [existingResults]);

  useEffect(() => {
    if (!students) return;
    const initial: Record<string, string> = {};
    for (const s of students) {
      const result = resultByStudent.get(s._id);
      initial[s._id] = result ? String(result.marksObtained) : "";
    }
    setMarks(initial);
  }, [students, resultByStudent]);

  const saveMarks = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(marks).filter(([, v]) => v !== "");
      await api.post(`/examinations/${examination!._id}/marks`, {
        subjectId: assignment!.subjectId._id,
        marks: entries.map(([studentId, marksObtained]) => ({ studentId, marksObtained: Number(marksObtained) })),
      });
    },
    onSuccess: () => {
      toast({ title: "Marks saved as draft" });
      qc.invalidateQueries({ queryKey: ["exam-results-entry"] });
    },
    onError: (err) => toast({ title: "Failed to save", description: getErrorMessage(err), variant: "destructive" }),
  });

  const hasEnteredMarks = Object.values(marks).some((v) => v !== "");
  const draftIds = existingResults.filter((r) => r.status === "draft").map((r) => r._id);
  const unpublishedIds = existingResults.filter((r) => r.status !== "published").map((r) => r._id);

  const submitForApproval = useMutation({
    mutationFn: async () => api.post("/examinations/results/submit", { resultIds: draftIds }),
    onSuccess: () => {
      toast({ title: `Submitted ${draftIds.length} result${draftIds.length === 1 ? "" : "s"} for admin review` });
      qc.invalidateQueries({ queryKey: ["exam-results-entry"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const publishResults = useMutation({
    mutationFn: async () => api.post("/examinations/results/publish", { resultIds: unpublishedIds }),
    onSuccess: () => {
      toast({ title: `Published ${unpublishedIds.length} result${unpublishedIds.length === 1 ? "" : "s"}`, description: "Visible to students and parents now." });
      qc.invalidateQueries({ queryKey: ["exam-results-entry"] });
    },
    onError: (err) => toast({ title: "Failed to publish", description: getErrorMessage(err), variant: "destructive" }),
  });

  const rejectedResults = existingResults.filter((r) => r.status === "rejected");

  const filteredStudents = (students ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q)
    );
  });

  const counts = {
    total: students?.length ?? 0,
    draft: existingResults.filter((r) => r.status === "draft").length,
    submitted: existingResults.filter((r) => r.status === "submitted").length,
    approvedOrPublished: existingResults.filter((r) => r.status === "approved" || r.status === "published").length,
  };
  const notEntered = Math.max(counts.total - existingResults.length, 0);

  // Class performance for this subject, computed from whatever's been entered so far —
  // gives the teacher an at-a-glance read on how the class did without leaving this page.
  const classAverage =
    subjectConfig && existingResults.length > 0
      ? Math.round((existingResults.reduce((sum, r) => sum + r.marksObtained, 0) / (existingResults.length * subjectConfig.maxMarks)) * 1000) / 10
      : null;
  const passRate =
    subjectConfig && existingResults.length > 0
      ? Math.round((existingResults.filter((r) => r.marksObtained >= subjectConfig.passMarks).length / existingResults.length) * 1000) / 10
      : null;

  return (
    <div>
      <PageHeader title="Examinations & Results" description="Enter marks for your subject, then publish them directly — no admin approval needed." />

      <div className="flex flex-wrap items-start gap-3 mb-5">
        <div className="min-w-[260px]">
          <AssignmentPicker assignments={teachingAssignments} value={assignment?._id} onChange={setAssignmentId} />
        </div>

        {examinations.length > 0 && (
          <Select value={examination?._id} onValueChange={setExaminationId}>
            <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select examination" /></SelectTrigger>
            <SelectContent>
              {examinations.map((e) => (
                <SelectItem key={e._id} value={e._id}>
                  {e.name} ({e.examType.replace(/_/g, " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {examination && (
          <Badge variant="outline" className={`capitalize mt-1.5 ${EXAM_STATUS_STYLES[examination.status] ?? ""}`}>
            {examination.status}
          </Badge>
        )}
      </div>

      {!assignment ? (
        <EmptyState icon={GraduationCap} title="No teaching assignments" description="Contact the school administrator if this seems wrong." />
      ) : examinations.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No examinations scheduled for this class yet" />
      ) : !examination ? null : !subjectConfig ? (
        <EmptyState
          icon={GraduationCap}
          title="This subject isn't configured for this examination"
          description="Ask an admin to add it under Examinations → New Examination."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
            <span>Max marks: <strong className="text-gray-700">{subjectConfig.maxMarks}</strong></span>
            <span>Pass marks: <strong className="text-gray-700">{subjectConfig.passMarks}</strong></span>
            {subjectConfig.examDate && (
              <span>Exam date: <strong className="text-gray-700">{new Date(subjectConfig.examDate).toLocaleDateString()}</strong></span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <StatCard label="Total Students" value={counts.total} icon={Users} />
            <StatCard label="Not Entered" value={notEntered} icon={Pencil} />
            <StatCard label="Draft" value={counts.draft} icon={Pencil} />
            <StatCard label="Awaiting Approval" value={counts.submitted} icon={Clock} />
            <StatCard label="Approved / Published" value={counts.approvedOrPublished} icon={CheckCircle2} />
          </div>

          {classAverage !== null && passRate !== null && (
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
              <StatCard label="Class Average" value={`${classAverage}%`} icon={BarChart3} hint={`Based on ${existingResults.length} of ${counts.total} entered`} />
              <StatCard label="Pass Rate" value={`${passRate}%`} icon={CheckCircle2} hint={`Based on ${existingResults.length} of ${counts.total} entered`} />
            </div>
          )}

          {rejectedResults.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4 text-sm text-red-700">
              <p className="font-medium flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                {rejectedResults.length} result{rejectedResults.length === 1 ? "" : "s"} rejected by admin — fix and save as draft again:
              </p>
              <ul className="space-y-1 ml-5 list-disc">
                {rejectedResults.map((r) => {
                  const sid = idOf(r.studentId);
                  const student = (students ?? []).find((s) => s._id === sid);
                  return (
                    <li key={r._id}>
                      {student ? `${student.firstName} ${student.lastName}` : "A student"}: {r.rejectedReason || "No reason given"}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="relative w-full max-w-xs mb-3">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input placeholder="Search student…" className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 uppercase tracking-wide px-0.5 pb-1.5 border-b">
                <span>Student</span>
                <span>Marks (out of {subjectConfig.maxMarks})</span>
              </div>
              <div>
                {filteredStudents.map((s) => {
                  const result = resultByStudent.get(s._id);
                  const locked = Boolean(result && ["submitted", "approved", "published"].includes(result.status));
                  const value = marks[s._id] ?? "";
                  const numeric = value !== "" ? Number(value) : undefined;
                  const passed = numeric !== undefined ? numeric >= subjectConfig.passMarks : undefined;
                  return (
                    <div key={s._id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                      <span className="text-sm text-gray-700 min-w-0 truncate">
                        {s.rollNumber ? `${s.rollNumber}. ` : ""}
                        {s.firstName} {s.lastName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {result && (
                          <Badge variant="outline" className={`capitalize text-[10px] ${RESULT_STATUS_STYLES[result.status] ?? ""}`}>
                            {result.status}
                          </Badge>
                        )}
                        {numeric !== undefined && (
                          <Badge variant="secondary" className={`text-[10px] ${passed ? "text-emerald-700" : "text-red-700"}`}>
                            {passed ? "Pass" : "Fail"}
                            {result?.grade ? ` · ${result.grade}` : ""}
                          </Badge>
                        )}
                        <Input
                          type="number"
                          min={0}
                          max={subjectConfig.maxMarks}
                          placeholder="Marks"
                          className="w-24 h-8"
                          value={value}
                          disabled={locked}
                          onChange={(e) => setMarks((m) => ({ ...m, [s._id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button onClick={() => saveMarks.mutate()} disabled={!hasEnteredMarks || saveMarks.isPending}>
                  {saveMarks.isPending ? "Saving…" : "Save Draft"}
                </Button>
                <Button
                  onClick={() => publishResults.mutate()}
                  disabled={unpublishedIds.length === 0 || publishResults.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {publishResults.isPending
                    ? "Publishing…"
                    : unpublishedIds.length > 0
                      ? `Publish ${unpublishedIds.length} Result${unpublishedIds.length === 1 ? "" : "s"}`
                      : "Publish Results"}
                </Button>
                <span className="text-gray-300 mx-1">|</span>
                <Button variant="outline" size="sm" onClick={() => submitForApproval.mutate()} disabled={draftIds.length === 0 || submitForApproval.isPending}>
                  {submitForApproval.isPending ? "Submitting…" : "Send for Admin Review Instead"}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Publishing makes marks visible to students and parents immediately. Use "Send for Admin Review Instead" if you'd rather have
                an admin double-check before it goes live.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
