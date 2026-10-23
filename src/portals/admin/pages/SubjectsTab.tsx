import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const ALL = "__all__";

interface Subject {
  _id: string;
  name: string;
  code: string;
  departmentId?: string;
  groupId?: string;
  applicableClasses?: string[];
  isElective: boolean;
}

/** Mirrors the backend's assertSubjectApplicableToClass rule. */
function isSubjectApplicableToClass(subject: Subject, classId: string | undefined, groupsById: Map<string, any>): boolean {
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

function SubjectDialog({
  open,
  onOpenChange,
  subject,
  classes,
  groups,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subject: Subject | null;
  classes: any[];
  groups: any[];
  departments: any[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(subject);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState<string>();
  const [groupId, setGroupId] = useState<string>();
  const [applicableClasses, setApplicableClasses] = useState<string[]>([]);
  const [isElective, setIsElective] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(subject?.name ?? "");
    setCode(subject?.code ?? "");
    setDepartmentId(subject?.departmentId ?? undefined);
    setGroupId(subject?.groupId ?? undefined);
    setApplicableClasses(subject?.applicableClasses ?? []);
    setIsElective(subject?.isElective ?? false);
  }, [open, subject]);

  const toggleClass = (id: string) => {
    setApplicableClasses((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        code,
        isElective,
        departmentId: departmentId || undefined,
        groupId: groupId || undefined,
        applicableClasses: groupId ? [] : applicableClasses,
      };
      return isEdit ? api.patch(`/subjects/${subject!._id}`, body) : api.post("/subjects", body);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Subject updated" : "Subject created" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Could not save subject", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="subj-name">Subject name</Label>
              <Input id="subj-name" placeholder="e.g. Physics" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="subj-code">Code</Label>
              <Input id="subj-code" placeholder="e.g. PHY101" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>

          {departments.length > 0 && (
            <div>
              <Label>Department</Label>
              <Select value={departmentId ?? ALL} onValueChange={(v) => setDepartmentId(v === ALL ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>None</SelectItem>
                  {departments.map((d: any) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isElective} onCheckedChange={(v) => setIsElective(Boolean(v))} />
            Elective (not compulsory for enrolled students)
          </label>

          <div>
            <Label>Academic group / stream</Label>
            <Select value={groupId ?? ALL} onValueChange={(v) => { setGroupId(v === ALL ? undefined : v); setApplicableClasses([]); }}>
              <SelectTrigger><SelectValue placeholder="None — not stream-specific" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>None — not stream-specific</SelectItem>
                {groups.map((g: any) => <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              {groupId
                ? "This subject applies only to the classes linked to this group."
                : "Leave as None unless this subject belongs to a stream like Science or Business Studies."}
            </p>
          </div>

          {!groupId && (
            <div>
              <Label>Applicable classes</Label>
              <p className="text-xs text-gray-400 mb-1.5">Leave all unchecked to apply this subject to every class.</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-36 overflow-y-auto border rounded-md p-2">
                {classes.map((c: any) => (
                  <label key={c._id} className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={applicableClasses.includes(c._id)} onCheckedChange={() => toggleClass(c._id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!name || !code || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SubjectsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: subjects } = useQuery<Subject[]>({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data.data });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data });
  const { data: groups } = useQuery({ queryKey: ["academic-groups"], queryFn: async () => (await api.get("/academic-groups")).data.data });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get("/departments")).data.data });

  const [classFilter, setClassFilter] = useState<string>();
  const [groupFilter, setGroupFilter] = useState<string>();
  const [deptFilter, setDeptFilter] = useState<string>();
  const [search, setSearch] = useState("");
  const [dialogSubject, setDialogSubject] = useState<Subject | null | undefined>(undefined);

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: () => {
      toast({ title: "Subject deleted" });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err) => toast({ title: "Could not delete subject", description: getErrorMessage(err), variant: "destructive" }),
  });

  const groupsById = new Map<string, any>((groups ?? []).map((g: any) => [g._id, g]));
  const classById = new Map<string, any>((classes ?? []).map((c: any) => [c._id, c]));
  const deptById = new Map<string, any>((departments ?? []).map((d: any) => [d._id, d]));

  const filtered = (subjects ?? []).filter((s) => {
    if (classFilter && !isSubjectApplicableToClass(s, classFilter, groupsById)) return false;
    if (groupFilter && s.groupId !== groupFilter) return false;
    if (deptFilter && s.departmentId !== deptFilter) return false;
    if (search && !`${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const applicabilityLabel = (s: Subject) => {
    if (s.groupId) return groupsById.get(s.groupId)?.name ?? "Group";
    if (s.applicableClasses?.length) return `${s.applicableClasses.length} class${s.applicableClasses.length === 1 ? "" : "es"}`;
    return "All classes";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <Label className="text-xs text-gray-500">Class</Label>
            <Select value={classFilter ?? ALL} onValueChange={(v) => setClassFilter(v === ALL ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-gray-500">Academic group</Label>
            <Select value={groupFilter ?? ALL} onValueChange={(v) => setGroupFilter(v === ALL ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All groups" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All groups</SelectItem>
                {(groups ?? []).map((g: any) => <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {departments?.length ? (
            <div className="min-w-[160px]">
              <Label className="text-xs text-gray-500">Department</Label>
              <Select value={deptFilter ?? ALL} onValueChange={(v) => setDeptFilter(v === ALL ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All departments</SelectItem>
                  {departments.map((d: any) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="relative flex-1 min-w-[180px]">
            <Label className="text-xs text-gray-500">Search</Label>
            <Search className="absolute left-2.5 top-[34px] w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8" placeholder="Name or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setDialogSubject(null)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Add Subject
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium text-gray-800">{s.name}</TableCell>
                    <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                    <TableCell className="text-gray-500">{s.departmentId ? deptById.get(s.departmentId)?.name ?? "—" : "—"}</TableCell>
                    <TableCell className="text-gray-500">{applicabilityLabel(s)}</TableCell>
                    <TableCell>
                      <Badge variant={s.isElective ? "secondary" : "outline"} className="text-[10px]">
                        {s.isElective ? "Elective" : "Compulsory"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDialogSubject(s)}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                If this subject is used in any teaching assignments, examinations, or timetable
                                entries, those references will no longer resolve correctly. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(s._id)}>Delete</AlertDialogAction>
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
            <EmptyState
              icon={BookOpen}
              title={subjects?.length ? "No subjects match these filters" : "No subjects yet"}
              description={subjects?.length ? "Try clearing a filter above." : "Add your first subject to get started."}
            />
          )}
        </CardContent>
      </Card>

      <SubjectDialog
        open={dialogSubject !== undefined}
        onOpenChange={(v) => !v && setDialogSubject(undefined)}
        subject={dialogSubject ?? null}
        classes={classes ?? []}
        groups={groups ?? []}
        departments={departments ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["subjects"] })}
      />
    </div>
  );
}
