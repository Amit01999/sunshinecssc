import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Users, UserPlus } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CopyableCode, TempPasswordDialog } from "@/components/dashboard/TempPasswordDialog";
import { LinkParentDialog } from "@/components/dashboard/LinkParentDialog";
import { useToast } from "@/hooks/use-toast";
import { useTeachingAssignments, TeachingAssignment } from "../useTeachingAssignments";
import { AssignmentPicker } from "../AssignmentPicker";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  rollNumber?: string;
  guardianInfo?: { guardianPhone?: string; guardianEmail?: string };
  userId?: { email: string; mustChangePassword: boolean };
}

function AddStudentDialog({ assignment, onAdded }: { assignment?: TeachingAssignment; onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", rollNumber: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post("/teacher/students", {
          ...form,
          classId: assignment!.classId._id,
          sectionId: assignment!.sectionId._id,
        })
      ).data.data,
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword);
      onAdded();
    },
    onError: (err) => toast({ title: "Could not add student", description: getErrorMessage(err), variant: "destructive" }),
  });

  const reset = () => {
    setForm({ firstName: "", lastName: "", email: "", rollNumber: "" });
    setTempPassword(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button disabled={!assignment}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Student — {assignment?.classId?.name} {assignment?.sectionId?.name}
          </DialogTitle>
        </DialogHeader>
        {tempPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Student account created. Share this temporary password securely — they must change it on first login.
            </p>
            <CopyableCode value={tempPassword} />
            <Button className="w-full" onClick={reset}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-student-first-name">First Name</Label>
                <Input id="add-student-first-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="add-student-last-name">Last Name</Label>
                <Input id="add-student-last-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="add-student-email">Email</Label>
              <Input id="add-student-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="add-student-roll">Roll Number</Label>
              <Input id="add-student-roll" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
            </div>
            <Button
              className="w-full"
              onClick={() => create.mutate()}
              disabled={!form.firstName || !form.lastName || !form.email || !form.rollNumber || create.isPending}
            >
              Add Student
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Students() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments = [] } = useTeachingAssignments();
  const [assignmentId, setAssignmentId] = useState<string>();
  const [search, setSearch] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);

  const assignment = assignments.find((a) => a._id === assignmentId) ?? assignments[0];

  const resetPassword = useMutation({
    mutationFn: async (studentId: string) => (await api.post(`/teacher/students/${studentId}/reset-password`)).data.data,
    onSuccess: (data) => setResetResult(data.temporaryPassword),
    onError: (err) => toast({ title: "Could not reset password", description: getErrorMessage(err), variant: "destructive" }),
  });

  const rosterKey = ["class-roster", assignment?.classId?._id, assignment?.sectionId?._id];
  const { data: students, isLoading } = useQuery({
    queryKey: rosterKey,
    enabled: Boolean(assignment),
    queryFn: async () =>
      (
        await api.get<{ data: Student[] }>(`/classes/${assignment!.classId._id}/roster`, {
          params: { sectionId: assignment!.sectionId._id },
        })
      ).data.data,
  });

  const filtered = (students ?? []).filter((s) =>
    `${s.firstName} ${s.lastName} ${s.studentCode} ${s.userId?.email ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="My Students"
        description="Student roster for your assigned classes. Add students directly to a class/section you teach."
        actions={<AddStudentDialog assignment={assignment} onAdded={() => qc.invalidateQueries({ queryKey: rosterKey })} />}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <AssignmentPicker assignments={assignments} value={assignment?._id} onChange={setAssignmentId} />
        <Input placeholder="Search by name, ID, or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Loading…</p>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Guardian Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{s.rollNumber ?? "—"}</TableCell>
                    <TableCell>{s.firstName} {s.lastName}</TableCell>
                    <TableCell className="text-gray-500">{s.studentCode}</TableCell>
                    <TableCell className="text-gray-500">{s.userId?.email ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{s.guardianInfo?.guardianPhone ?? "—"}</TableCell>
                    <TableCell>
                      {s.userId?.mustChangePassword && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Pending first login
                          </Badge>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-[11px]"
                            onClick={() => resetPassword.mutate(s._id)}
                            disabled={resetPassword.isPending}
                          >
                            Show Password
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <LinkParentDialog
                          studentProfileId={s._id}
                          studentName={`${s.firstName} ${s.lastName}`.trim() || s.studentCode}
                          parentOptionsEndpoint="/teacher/students/parents"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => resetPassword.mutate(s._id)}
                          disabled={resetPassword.isPending}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Users} title="No students found" />
          )}
        </CardContent>
      </Card>

      <TempPasswordDialog
        password={resetResult}
        onOpenChange={(open) => !open && setResetResult(null)}
        title="Password Reset"
        description="This student's password was reset. Share this new temporary password securely — it replaces their old one, which no longer works."
      />
    </div>
  );
}
