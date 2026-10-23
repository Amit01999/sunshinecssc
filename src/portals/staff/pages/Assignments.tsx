import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTeachingAssignments } from "../useTeachingAssignments";
import { AssignmentPicker } from "../AssignmentPicker";

function GradeDialog({ submission, maxMarks, onGraded }: { submission: any; maxMarks: number; onGraded: () => void }) {
  const { toast } = useToast();
  const [marks, setMarks] = useState(submission.marksObtained ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [open, setOpen] = useState(false);

  const grade = useMutation({
    mutationFn: async () => api.post(`/assignments/submissions/${submission._id}/grade`, { marksObtained: Number(marks), feedback }),
    onSuccess: () => {
      toast({ title: "Graded" });
      setOpen(false);
      onGraded();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={submission.status === "graded" ? "outline" : "default"}>
          {submission.status === "graded" ? "Edit Grade" : "Grade"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="number" max={maxMarks} placeholder={`Marks (max ${maxMarks})`} value={marks} onChange={(e) => setMarks(e.target.value)} />
          <Textarea placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <Button className="w-full" onClick={() => grade.mutate()} disabled={grade.isPending}>
            Save Grade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateAssignmentDialog({ assignment, onCreated }: { assignment: any; onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [dueDate, setDueDate] = useState("");

  const create = useMutation({
    mutationFn: async () =>
      api.post("/assignments", {
        classId: assignment.classId._id,
        sectionId: assignment.sectionId._id,
        subjectId: assignment.subjectId._id,
        academicYearId: assignment.academicYearId,
        title,
        instructions,
        maxMarks: Number(maxMarks),
        dueDate,
      }),
    onSuccess: async (res) => {
      await api.patch(`/assignments/${res.data.data._id}`, { status: "published" });
      toast({ title: "Assignment published" });
      setOpen(false);
      setTitle("");
      setInstructions("");
      setDueDate("");
      onCreated();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!assignment}>New Assignment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Assignment — {assignment?.classId?.name} {assignment?.sectionId?.name} ({assignment?.subjectId?.name})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Max marks" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !dueDate || create.isPending}>
            Publish Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Assignments() {
  const qc = useQueryClient();
  const { data: teachingAssignments = [] } = useTeachingAssignments();
  const [assignmentId, setAssignmentId] = useState<string>();
  const [selectedAssignmentForGrading, setSelectedAssignmentForGrading] = useState<string | null>(null);
  const assignment = teachingAssignments.find((a) => a._id === assignmentId) ?? teachingAssignments[0];

  const { data: myAssignments } = useQuery({
    queryKey: ["teacher-assignments"],
    queryFn: async () => (await api.get("/assignments")).data.data,
  });

  const { data: submissions } = useQuery({
    queryKey: ["submissions", selectedAssignmentForGrading],
    enabled: Boolean(selectedAssignmentForGrading),
    queryFn: async () => (await api.get(`/assignments/${selectedAssignmentForGrading}/submissions`)).data.data,
  });

  return (
    <div>
      <PageHeader
        title="Assignments & Homework"
        description="Create assignments and review student submissions."
        actions={<CreateAssignmentDialog assignment={assignment} onCreated={() => qc.invalidateQueries({ queryKey: ["teacher-assignments"] })} />}
      />
      <div className="mb-4">
        <AssignmentPicker assignments={teachingAssignments} value={assignment?._id} onChange={setAssignmentId} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {myAssignments?.length ? (
              <div className="space-y-2">
                {myAssignments.map((a: any) => (
                  <button
                    key={a._id}
                    onClick={() => setSelectedAssignmentForGrading(a._id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedAssignmentForGrading === a._id ? "border-[hsl(208,89%,40%)] bg-blue-50/50" : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{a.title}</span>
                      <Badge variant="outline" className="capitalize">{a.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Due {new Date(a.dueDate).toLocaleDateString()} · Max {a.maxMarks}</p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="No assignments created yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAssignmentForGrading ? (
              <EmptyState icon={ClipboardList} title="Select an assignment to review submissions" />
            ) : submissions?.length ? (
              <div className="space-y-2">
                {submissions.map((s: any) => {
                  const parentAssignment = myAssignments?.find((a: any) => a._id === selectedAssignmentForGrading);
                  return (
                    <div key={s._id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="text-sm text-gray-800">{s.studentId?.firstName} {s.studentId?.lastName}</p>
                        <Badge variant="secondary" className="capitalize text-[10px]">{s.status}</Badge>
                      </div>
                      <GradeDialog
                        submission={s}
                        maxMarks={parentAssignment?.maxMarks ?? 100}
                        onGraded={() => qc.invalidateQueries({ queryKey: ["submissions", selectedAssignmentForGrading] })}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="No submissions yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
