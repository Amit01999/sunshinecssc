import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Building2, Layers, Pencil, Plus, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AcademicGroupsPanel } from "./AcademicGroupsPanel";

const ALL = "__all__";

function useList(path: string, key: string, params?: Record<string, unknown>) {
  return useQuery({ queryKey: [key, params], queryFn: async () => (await api.get(path, { params })).data.data });
}

// The actual classes Sunshine CSSC runs, as shown on the public "Our Classes" page
// (src/pages/Classes.tsx) — offered here as a one-click starting point for admins
// instead of typing all fifteen in one at a time.
const STANDARD_CLASSES = [
  "Play Group",
  "Nursery",
  "Kindergarten",
  "Class-1",
  "Class-2",
  "Class-3",
  "Class-4",
  "Class-5",
  "Class-6",
  "Class-7",
  "Class-8",
  "Class-9",
  "Class-10",
  "Class-11",
  "Class-12",
];

interface RosterStudent {
  _id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  studentCode: string;
}

/* ---------------------------------------------------------------------- */
/* Class create/edit dialog                                               */
/* ---------------------------------------------------------------------- */

function ClassDialog({
  open,
  onOpenChange,
  editingClass,
  academicYearId,
  yearName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingClass: any | null;
  academicYearId: string | undefined;
  yearName: string | undefined;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(editingClass);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(editingClass?.name ?? "");
  }, [open, editingClass]);

  const save = useMutation({
    mutationFn: async () =>
      isEdit ? api.patch(`/classes/${editingClass._id}`, { name }) : api.post("/classes", { name, academicYearId }),
    onSuccess: () => {
      toast({ title: isEdit ? "Class updated" : "Class created" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Could not save class", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="class-name">Class name</Label>
            <Input id="class-name" placeholder="e.g. Class 9" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="text-xs text-gray-400">Academic year: {yearName ?? "—"}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------------- */
/* Section create/edit dialog                                             */
/* ---------------------------------------------------------------------- */

function SectionDialog({
  open,
  onOpenChange,
  editingSection,
  classId,
  className,
  groups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingSection: any | null;
  classId: string;
  className: string;
  groups: any[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(editingSection);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [groupId, setGroupId] = useState<string>();

  useEffect(() => {
    if (open) {
      setName(editingSection?.name ?? "");
      setCapacity(editingSection?.capacity ? String(editingSection.capacity) : "");
      setGroupId(editingSection?.groupId ?? undefined);
    }
  }, [open, editingSection]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, capacity: capacity ? Number(capacity) : undefined, groupId: groupId || undefined };
      return isEdit
        ? api.patch(`/classes/${classId}/sections/${editingSection._id}`, body)
        : api.post(`/classes/${classId}/sections`, body);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Section updated" : "Section created" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Could not save section", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Section" : `Add Section — ${className}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="section-name">Section name</Label>
            <Input id="section-name" placeholder="e.g. A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="section-capacity">Capacity (optional)</Label>
            <Input id="section-capacity" type="number" placeholder="e.g. 40" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          {groups.length > 0 && (
            <div>
              <Label>Academic group / stream (optional)</Label>
              <Select value={groupId ?? ALL} onValueChange={(v) => setGroupId(v === ALL ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>None</SelectItem>
                  {groups.map((g: any) => <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Only for classes split by stream, e.g. Class XI Section A = Science.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------------- */
/* Student transfer / bulk promotion (unchanged behavior)                 */
/* ---------------------------------------------------------------------- */

function TargetPicker({
  years,
  yearId,
  setYearId,
  classId,
  setClassId,
  sectionId,
  setSectionId,
  excludeClassId,
}: {
  years: any[];
  yearId: string | undefined;
  setYearId: (v: string) => void;
  classId: string | undefined;
  setClassId: (v: string) => void;
  sectionId: string | undefined;
  setSectionId: (v: string) => void;
  excludeClassId?: string;
}) {
  const { data: classes } = useQuery({
    queryKey: ["classes-for-target", yearId],
    enabled: Boolean(yearId),
    queryFn: async () => (await api.get("/classes", { params: { academicYearId: yearId } })).data.data,
  });
  const { data: sections } = useQuery({
    queryKey: ["sections-for-target", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });
  const classOptions = (classes ?? []).filter((c: any) => c._id !== excludeClassId);

  return (
    <div className="space-y-3">
      <div>
        <Label>Academic Year</Label>
        <Select value={yearId} onValueChange={(v) => { setYearId(v); setClassId(""); setSectionId(""); }}>
          <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
          <SelectContent>
            {years.map((y: any) => (
              <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Target Class</Label>
        <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }} disabled={!yearId}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classOptions.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Target Section</Label>
        <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
          <SelectContent>
            {(sections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  student,
  years,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: RosterStudent | null;
  years: any[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [yearId, setYearId] = useState<string>();
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const [rollNumber, setRollNumber] = useState("");

  useEffect(() => {
    if (open && student) {
      setYearId(years.find((y: any) => y.isActive)?._id ?? years[0]?._id);
      setClassId(undefined);
      setSectionId(undefined);
      setRollNumber(student.rollNumber ?? "");
    }
  }, [open, student]);

  const transfer = useMutation({
    mutationFn: async () => api.post(`/classes/students/${student!._id}/transfer`, { classId, sectionId, rollNumber }),
    onSuccess: () => {
      toast({ title: "Student transferred", description: `${student?.firstName} ${student?.lastName} moved successfully.` });
      onOpenChange(false);
      onDone();
    },
    onError: (err) => toast({ title: "Transfer failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer {student ? `${student.firstName} ${student.lastName}` : "Student"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <TargetPicker years={years} yearId={yearId} setYearId={setYearId} classId={classId} setClassId={setClassId} sectionId={sectionId} setSectionId={setSectionId} />
          <div>
            <Label>Roll Number</Label>
            <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Roll number in the target section" />
          </div>
          <p className="text-xs text-gray-500">
            Previous enrollment history is preserved — this student's current class and section records remain available for past terms.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!classId || !sectionId || !rollNumber || transfer.isPending}
          >
            {transfer.isPending ? "Transferring…" : "Transfer Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoteSectionDialog({
  open,
  onOpenChange,
  roster,
  years,
  sourceClassId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roster: RosterStudent[];
  years: any[];
  sourceClassId: string | undefined;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [yearId, setYearId] = useState<string>();
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();

  useEffect(() => {
    if (open) {
      setYearId(undefined);
      setClassId(undefined);
      setSectionId(undefined);
    }
  }, [open]);

  const promote = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        roster.map((s) =>
          api.post(`/classes/students/${s._id}/transfer`, {
            classId,
            sectionId,
            rollNumber: s.rollNumber ?? s.studentCode,
          }),
        ),
      );
      const failed = results
        .map((r, i) => ({ r, student: roster[i] }))
        .filter(({ r }) => r.status === "rejected")
        .map(({ r, student }) => ({
          name: `${student.firstName} ${student.lastName}`,
          message: getErrorMessage((r as PromiseRejectedResult).reason),
        }));
      return { succeeded: results.length - failed.length, total: results.length, failed };
    },
    onSuccess: ({ succeeded, total, failed }) => {
      if (failed.length === 0) {
        toast({ title: `Promoted all ${total} student(s)` });
      } else {
        toast({
          title: `Promoted ${succeeded} of ${total} student(s)`,
          description: failed.map((f) => `${f.name}: ${f.message}`).join("; "),
          variant: failed.length === total ? "destructive" : undefined,
        });
      }
      onOpenChange(false);
      onDone();
    },
    onError: (err) => toast({ title: "Promotion failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Entire Section ({roster.length} student{roster.length === 1 ? "" : "s"})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Every student currently active in this section will be moved to the target class/section below, keeping their
            existing roll number where possible. Each student's prior enrollment is preserved as history. If a roll number
            already exists in the target section, that one student is skipped and reported — the rest still go through.
          </p>
          <TargetPicker years={years} yearId={yearId} setYearId={setYearId} classId={classId} setClassId={setClassId} sectionId={sectionId} setSectionId={setSectionId} excludeClassId={sourceClassId} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => promote.mutate()}
            disabled={!classId || !sectionId || roster.length === 0 || promote.isPending}
          >
            {promote.isPending ? "Promoting…" : `Promote ${roster.length} Student(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RosterPanel({ classId, sectionId, className, sectionName, years }: {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  years: any[];
}) {
  const qc = useQueryClient();
  const rosterKey = ["admin-class-roster", classId, sectionId];
  const { data: roster, isLoading } = useQuery({
    queryKey: rosterKey,
    queryFn: async () => (await api.get(`/classes/${classId}/roster`, { params: { sectionId } })).data.data as RosterStudent[],
  });

  const [transferTarget, setTransferTarget] = useState<RosterStudent | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: rosterKey });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            {className} · Section {sectionName} — Roster
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">{roster?.length ?? 0} active student(s)</p>
        </div>
        {Boolean(roster?.length) && (
          <Button size="sm" variant="outline" onClick={() => setPromoteOpen(true)}>
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Promote Section
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Loading roster…</p>
        ) : roster?.length ? (
          <div className="divide-y">
            {roster.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="text-gray-400 ml-2">Roll {s.rollNumber ?? "—"} · {s.studentCode}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setTransferTarget(s)}>
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Transfer
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Users} title="No students enrolled in this section yet" />
        )}
      </CardContent>

      <TransferDialog
        open={Boolean(transferTarget)}
        onOpenChange={(v) => !v && setTransferTarget(null)}
        student={transferTarget}
        years={years}
        onDone={refresh}
      />
      <PromoteSectionDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        roster={roster ?? []}
        years={years}
        sourceClassId={classId}
        onDone={refresh}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Main tab                                                                */
/* ---------------------------------------------------------------------- */

export default function ClassesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: years } = useList("/academic-years", "years");
  const { data: groups } = useList("/academic-groups", "academic-groups");
  const [academicYearId, setAcademicYearId] = useState<string>();
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedSection, setSelectedSection] = useState<string>();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);

  useEffect(() => {
    if (!academicYearId && years?.length) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [years, academicYearId]);

  const { data: classes } = useQuery({
    queryKey: ["classes-for-year", academicYearId],
    enabled: Boolean(academicYearId),
    queryFn: async () => (await api.get("/classes", { params: { academicYearId } })).data.data,
  });

  useEffect(() => {
    setSelectedClass(undefined);
  }, [academicYearId]);
  useEffect(() => {
    setSelectedSection(undefined);
  }, [selectedClass]);

  const { data: sections } = useQuery({
    queryKey: ["sections", selectedClass],
    enabled: Boolean(selectedClass),
    queryFn: async () => (await api.get(`/classes/${selectedClass}/sections`)).data.data,
  });

  const existingNames = new Set((classes ?? []).map((c: any) => c.name));
  const missingStandardClasses = STANDARD_CLASSES.filter((n) => !existingNames.has(n));

  const createStandardClasses = useMutation({
    mutationFn: async () => {
      let created = 0;
      let skipped = 0;
      for (let i = 0; i < STANDARD_CLASSES.length; i++) {
        const className = STANDARD_CLASSES[i];
        if (existingNames.has(className)) {
          skipped++;
          continue;
        }
        try {
          await api.post("/classes", { name: className, academicYearId, order: i });
          created++;
        } catch {
          skipped++;
        }
      }
      return { created, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      toast({ title: `Added ${created} class${created === 1 ? "" : "es"}`, description: skipped ? `${skipped} already existed and were skipped.` : undefined });
      qc.invalidateQueries({ queryKey: ["classes-for-year", academicYearId] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const activeClass = (classes ?? []).find((c: any) => c._id === selectedClass);
  const activeSection = (sections ?? []).find((s: any) => s._id === selectedSection);
  const groupById = new Map<string, any>((groups ?? []).map((g: any) => [g._id, g]));

  const refreshClasses = () => qc.invalidateQueries({ queryKey: ["classes-for-year", academicYearId] });
  const refreshSections = () => qc.invalidateQueries({ queryKey: ["sections", selectedClass] });

  return (
    <div className="space-y-4">
      {/* Step 1: Academic year context */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Layers className="w-4 h-4 text-gray-400 shrink-0" />
          <Label className="text-xs text-gray-500 shrink-0">Academic Year</Label>
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select a year" /></SelectTrigger>
            <SelectContent>
              {(years ?? []).map((y: any) => <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          {!years?.length && (
            <span className="text-xs text-amber-600">No academic years yet — create one in the Academic Years tab first.</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{(classes ?? []).length} class{(classes ?? []).length === 1 ? "" : "es"} in this year</span>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Step 2: Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Classes</CardTitle>
            <div className="flex gap-2">
              {missingStandardClasses.length > 0 && academicYearId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createStandardClasses.mutate()}
                  disabled={createStandardClasses.isPending}
                >
                  {createStandardClasses.isPending ? "Adding…" : `Add Standard Classes (${missingStandardClasses.length})`}
                </Button>
              )}
              <Button size="sm" onClick={() => { setEditingClass(null); setClassDialogOpen(true); }} disabled={!academicYearId}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Class
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!academicYearId ? (
              <EmptyState icon={Layers} title="Select an academic year to manage its classes" />
            ) : classes?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((c: any) => (
                    <TableRow
                      key={c._id}
                      data-state={selectedClass === c._id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedClass(c._id)}
                    >
                      <TableCell className="font-medium text-gray-800">{c.name}</TableCell>
                      <TableCell className="text-gray-500">{selectedClass === c._id ? (sections?.length ?? "…") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingClass(c); setClassDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Building2} title="No classes yet for this year" description="Add a class, or use Add Standard Classes above." />
            )}
          </CardContent>
        </Card>

        {/* Step 3: Sections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {activeClass ? `Sections — ${activeClass.name}` : "Sections"}
            </CardTitle>
            {activeClass && (
              <Button size="sm" onClick={() => { setEditingSection(null); setSectionDialogOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Section
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!selectedClass ? (
              <EmptyState icon={Building2} title="Select a class to manage its sections" />
            ) : sections?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((s: any) => (
                    <TableRow
                      key={s._id}
                      data-state={selectedSection === s._id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedSection(s._id)}
                    >
                      <TableCell className="font-medium text-gray-800">Section {s.name}</TableCell>
                      <TableCell className="text-gray-500">{s.capacity ?? "—"}</TableCell>
                      <TableCell>{s.groupId ? <Badge variant="outline">{groupById.get(s.groupId)?.name ?? "Group"}</Badge> : <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingSection(s); setSectionDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Building2} title="No sections yet" description="Add a section to start enrolling students." />
            )}
            {sections?.length ? <p className="text-xs text-gray-400 px-4 py-2 border-t">Click a section to view its roster and manage transfers.</p> : null}
          </CardContent>
        </Card>
      </div>

      {activeClass && activeSection && (
        <RosterPanel
          classId={activeClass._id}
          sectionId={activeSection._id}
          className={activeClass.name}
          sectionName={activeSection.name}
          years={years ?? []}
        />
      )}

      <AcademicGroupsPanel classes={classes ?? []} />

      <ClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        editingClass={editingClass}
        academicYearId={academicYearId}
        yearName={(years ?? []).find((y: any) => y._id === academicYearId)?.name}
        onSaved={refreshClasses}
      />
      {activeClass && (
        <SectionDialog
          open={sectionDialogOpen}
          onOpenChange={setSectionDialogOpen}
          editingSection={editingSection}
          classId={activeClass._id}
          className={activeClass.name}
          groups={groups ?? []}
          onSaved={refreshSections}
        />
      )}
    </div>
  );
}
