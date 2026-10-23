import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, KeyRound, Ban, CheckCircle } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CopyableCode, TempPasswordDialog } from "@/components/dashboard/TempPasswordDialog";
import { LinkParentDialog } from "@/components/dashboard/LinkParentDialog";
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

const ROLES = ["student", "parent", "teacher", "staff", "admin", "academic_admin"];
// Academic Admin currently has identical permissions to Admin, so creating one here would just
// be a confusing duplicate - hidden from account creation until it's a real, distinct role.
// Existing academic_admin accounts and the role filter above are untouched.
const CREATABLE_ROLES = ROLES.filter((r) => r !== "academic_admin");

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "student", firstName: "", lastName: "" });
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const [rollNumber, setRollNumber] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: years } = useQuery({
    queryKey: ["years-for-user-create"],
    enabled: open && form.role === "student",
    queryFn: async () => (await api.get("/academic-years")).data.data,
  });
  const { data: classes } = useQuery({
    queryKey: ["classes-for-user-create"],
    enabled: open && form.role === "student",
    queryFn: async () => (await api.get("/classes")).data.data,
  });
  const { data: sections } = useQuery({
    queryKey: ["sections-for-user-create", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const isStudent = form.role === "student";
      const activeYearId = isStudent ? (years ?? []).find((y: any) => y.isActive)?._id ?? (years ?? [])[0]?._id : undefined;
      return (
        await api.post("/admin/users", {
          ...form,
          ...(isStudent && classId && sectionId && rollNumber
            ? { classId, sectionId, rollNumber, academicYearId: activeYearId }
            : {}),
        })
      ).data.data;
    },
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword);
      onCreated();
    },
    onError: (err) => toast({ title: "Failed to create user", description: getErrorMessage(err), variant: "destructive" }),
  });

  const reset = () => {
    setForm({ email: "", role: "student", firstName: "", lastName: "" });
    setClassId(undefined);
    setSectionId(undefined);
    setRollNumber("");
    setTempPassword(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button>New User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        {tempPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Account created. Share this temporary password securely — the user must change it on first login.
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
                <Label htmlFor="new-user-first-name">First Name</Label>
                <Input id="new-user-first-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-user-last-name">Last Name</Label>
                <Input id="new-user-last-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === "student" ? (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs text-gray-500">Class, section and roll number (optional — can also be set later via a Transfer in Academics → Classes & Sections).</p>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(undefined); }}>
                  <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>{(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>{(sections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Roll number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Teacher class assignments are set afterwards from Academics → Teaching Assignments.
              </p>
            )}
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.email || !form.firstName || create.isPending}>
              Create Account
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter, search],
    queryFn: async () =>
      (
        await api.get("/admin/users", { params: { role: roleFilter === "all" ? undefined : roleFilter, search: search || undefined } })
      ).data.data,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const [resetResult, setResetResult] = useState<string | null>(null);
  const resetPassword = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/users/${id}/reset-password`)).data.data,
    onSuccess: (data) => {
      setResetResult(data.temporaryPassword);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div>
      <PageHeader
        title="Users & Access"
        description="Create and manage accounts for every role."
        actions={<CreateUserDialog onCreated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.concat(["super_admin"]).map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Loading…</p>
          ) : users?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u._id}>
                    <TableCell>{u.profile ? `${u.profile.firstName ?? ""} ${u.profile.lastName ?? ""}` : "—"}</TableCell>
                    <TableCell className="text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{u.role.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                        {u.mustChangePassword && (
                          <>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Pending first login
                            </Badge>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-[11px]"
                              onClick={() => resetPassword.mutate(u._id)}
                              disabled={resetPassword.isPending}
                            >
                              Show Password
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {u.role === "student" && u.profile && (
                          <LinkParentDialog
                            studentProfileId={u.profile._id}
                            studentName={`${u.profile.firstName ?? ""} ${u.profile.lastName ?? ""}`.trim() || u.email}
                            parentOptionsEndpoint="/admin/users?role=parent"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => resetPassword.mutate(u._id)}
                          disabled={resetPassword.isPending}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title={u.isActive ? "Deactivate" : "Activate"}>
                              {u.isActive ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{u.isActive ? "Deactivate" : "Activate"} this account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.isActive
                                  ? "The user will immediately lose access to their dashboard."
                                  : "The user will regain access to their dashboard."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleActive.mutate({ id: u._id, isActive: !u.isActive })}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={UsersIcon} title="No users found" />
          )}
        </CardContent>
      </Card>

      <TempPasswordDialog
        password={resetResult}
        onOpenChange={(open) => !open && setResetResult(null)}
        title="Password Reset"
        description="This user's password was reset. Share this new temporary password securely — it replaces their old one, which no longer works."
      />
    </div>
  );
}
