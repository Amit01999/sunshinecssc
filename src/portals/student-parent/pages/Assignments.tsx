import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Paperclip, CheckCircle2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useStudentScope } from "../useStudentScope";

interface Assignment {
  _id: string;
  title: string;
  instructions?: string;
  maxMarks: number;
  dueDate: string;
  subjectId?: { name: string };
  submission?: { status: string; marksObtained?: number; feedback?: string } | null;
}

function SubmitDialog({ assignment }: { assignment: Assignment }) {
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const submit = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("textAnswer", textAnswer);
      if (file) form.append("files", file);
      await api.post(`/assignments/${assignment._id}/submit`, form);
    },
    onSuccess: () => {
      toast({ title: "Assignment submitted" });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setOpen(false);
    },
    onError: (err) => toast({ title: "Submission failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Submit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea placeholder="Write your answer (optional)" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Assignments() {
  const { user } = useAuth();
  const { studentId, ready } = useStudentScope();
  const isStudent = user?.role === "student";

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments", studentId],
    enabled: ready,
    queryFn: async () => {
      const params = studentId ? { studentId } : {};
      const res = await api.get<{ data: Assignment[] }>("/assignments", { params });
      return res.data.data;
    },
  });

  if (!ready) return <EmptyState icon={ClipboardList} title="Select a child above to view assignments" />;

  return (
    <div>
      <PageHeader title="Assignments & Homework" description="Published assignments for your class, with due dates and submission status." />
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : assignments && assignments.length > 0 ? (
        <div className="grid gap-4">
          {assignments.map((a) => (
            <Card key={a._id}>
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{a.title}</p>
                    {a.subjectId?.name && <Badge variant="outline">{a.subjectId.name}</Badge>}
                  </div>
                  {a.instructions && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.instructions}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Due {new Date(a.dueDate).toLocaleDateString()} · Max marks {a.maxMarks}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.submission ? (
                    a.submission.status === "submitted" ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </Badge>
                    ) : (
                      <div className="text-right">
                        <Badge>{a.submission.marksObtained}/{a.maxMarks}</Badge>
                        {a.submission.feedback && <p className="text-xs text-gray-400 mt-1 max-w-[200px]">{a.submission.feedback}</p>}
                      </div>
                    )
                  ) : isStudent ? (
                    <SubmitDialog assignment={a} />
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Paperclip className="w-3 h-3" /> Not submitted
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No assignments yet" description="New homework from your teachers will appear here." />
      )}
    </div>
  );
}
