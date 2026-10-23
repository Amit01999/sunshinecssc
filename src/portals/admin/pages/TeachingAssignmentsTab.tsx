import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/** Mirrors the backend's assertSubjectApplicableToClass rule. */
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

export default function TeachingAssignmentsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: years } = useQuery({ queryKey: ["years"], queryFn: async () => (await api.get("/academic-years")).data.data });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data.data });
  const { data: groups } = useQuery({ queryKey: ["academic-groups"], queryFn: async () => (await api.get("/academic-groups")).data.data });
  const { data: teachers } = useQuery({
    queryKey: ["teachers-list-active"],
    queryFn: async () => (await api.get("/admin/users", { params: { role: "teacher", status: "active" } })).data.data,
  });
  const { data: assignments } = useQuery({
    queryKey: ["assignments-list"],
    queryFn: async () => (await api.get("/teaching-assignments")).data.data,
  });

  const [academicYearId, setAcademicYearId] = useState<string>();
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const [subjectId, setSubjectId] = useState<string>();
  const [teacherId, setTeacherId] = useState<string>();

  // Table filters, independent of the create form above.
  const [filterClassId, setFilterClassId] = useState<string>();
  const [filterSectionId, setFilterSectionId] = useState<string>();
  const [filterSubjectId, setFilterSubjectId] = useState<string>();
  const [filterTeacherId, setFilterTeacherId] = useState<string>();

  const groupsById = useMemo(() => new Map<string, any>((groups ?? []).map((g: any) => [g._id, g])), [groups]);
  const eligibleSubjects = useMemo(
    () => (subjects ?? []).filter((s: any) => isSubjectApplicableToClass(s, classId, groupsById)),
    [subjects, classId, groupsById],
  );
  const activeTeachers = useMemo(
    () => (teachers ?? []).filter((t: any) => !t.profile || t.profile.status !== "inactive"),
    [teachers],
  );
  const workloadByTeacher = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assignments ?? []) {
      const id = a.teacherId?._id ?? a.teacherId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [assignments]);

  useEffect(() => {
    if (!academicYearId && years?.length) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [years, academicYearId]);

  const { data: sections } = useQuery({
    queryKey: ["sections-for-assign", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });
  const { data: filterSections } = useQuery({
    queryKey: ["sections-for-filter", filterClassId],
    enabled: Boolean(filterClassId),
    queryFn: async () => (await api.get(`/classes/${filterClassId}/sections`)).data.data,
  });

  useEffect(() => {
    if (subjectId && !eligibleSubjects.some((s: any) => s._id === subjectId)) setSubjectId(undefined);
  }, [classId, subjectId, eligibleSubjects]);
  useEffect(() => setSectionId(undefined), [classId]);
  useEffect(() => setFilterSectionId(undefined), [filterClassId]);

  const existingForCombo = (assignments ?? []).find(
    (a: any) =>
      (a.classId?._id ?? a.classId) === classId &&
      (a.sectionId?._id ?? a.sectionId) === sectionId &&
      (a.subjectId?._id ?? a.subjectId) === subjectId,
  );

  const create = useMutation({
    mutationFn: async () => api.post("/teaching-assignments", { academicYearId, classId, sectionId, subjectId, teacherId }),
    onSuccess: () => {
      toast({ title: "Teaching assignment created" });
      setSubjectId(undefined);
      setTeacherId(undefined);
      qc.invalidateQueries({ queryKey: ["assignments-list"] });
    },
    onError: (err) => toast({ title: "Could not create assignment", description: getErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/teaching-assignments/${id}`),
    onSuccess: () => {
      toast({ title: "Assignment removed" });
      qc.invalidateQueries({ queryKey: ["assignments-list"] });
    },
    onError: (err) => toast({ title: "Could not remove assignment", description: getErrorMessage(err), variant: "destructive" }),
  });

  const filteredAssignments = (assignments ?? []).filter((a: any) => {
    if (filterClassId && (a.classId?._id ?? a.classId) !== filterClassId) return false;
    if (filterSectionId && (a.sectionId?._id ?? a.sectionId) !== filterSectionId) return false;
    if (filterSubjectId && (a.subjectId?._id ?? a.subjectId) !== filterSubjectId) return false;
    if (filterTeacherId && (a.teacherId?._id ?? a.teacherId) !== filterTeacherId) return false;
    return true;
  });

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
      <Card>
        <CardHeader><CardTitle className="text-base">Assign Teacher to Subject</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!years?.length && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              No academic year exists yet. Create one in the "Academic Years" tab first.
            </p>
          )}
          <div>
            <Label className="text-xs text-gray-500">1. Academic year</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
              <SelectContent>
                {(years ?? []).map((y: any) => (
                  <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">2. Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>{(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">3. Section</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder={classId ? "Section" : "Select a class first"} /></SelectTrigger>
              <SelectContent>{(sections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">4. Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!sectionId || eligibleSubjects.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={classId && eligibleSubjects.length === 0 ? "No subjects configured for this class" : "Subject"} />
              </SelectTrigger>
              <SelectContent>{eligibleSubjects.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">5. Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={!subjectId}>
              <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
              <SelectContent>
                {activeTeachers.map((t: any) => (
                  <SelectItem key={t.profile?._id} value={t.profile?._id}>
                    {t.profile?.firstName} {t.profile?.lastName}
                    {" — "}
                    {t.profile?.employeeId ?? t.email}
                    {workloadByTeacher.get(t.profile?._id) ? ` (${workloadByTeacher.get(t.profile?._id)} assignment${workloadByTeacher.get(t.profile?._id) === 1 ? "" : "s"})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {existingForCombo && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This subject is already assigned to {existingForCombo.teacherId?.firstName} {existingForCombo.teacherId?.lastName} for
              this class/section. Remove that assignment first to reassign it.
            </p>
          )}

          <Button
            className="w-full"
            onClick={() => create.mutate()}
            disabled={!academicYearId || !classId || !sectionId || !subjectId || !teacherId || Boolean(existingForCombo) || create.isPending}
          >
            {create.isPending ? "Assigning…" : "Assign Teacher"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base mb-2">All Teaching Assignments</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={filterClassId ?? ALL} onValueChange={(v) => setFilterClassId(v === ALL ? undefined : v)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSectionId ?? ALL} onValueChange={(v) => setFilterSectionId(v === ALL ? undefined : v)} disabled={!filterClassId}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sections</SelectItem>
                {(filterSections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSubjectId ?? ALL} onValueChange={(v) => setFilterSubjectId(v === ALL ? undefined : v)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {(subjects ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTeacherId ?? ALL} onValueChange={(v) => setFilterTeacherId(v === ALL ? undefined : v)}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All teachers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All teachers</SelectItem>
                {(teachers ?? []).map((t: any) => (
                  <SelectItem key={t.profile?._id} value={t.profile?._id}>{t.profile?.firstName} {t.profile?.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAssignments.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((a: any) => (
                  <TableRow key={a._id}>
                    <TableCell className="text-gray-500 text-xs">{years?.find((y: any) => y._id === (a.academicYearId?._id ?? a.academicYearId))?.name ?? "—"}</TableCell>
                    <TableCell>{a.classId?.name}</TableCell>
                    <TableCell>{a.sectionId?.name}</TableCell>
                    <TableCell>{a.subjectId?.name}</TableCell>
                    <TableCell>{a.teacherId?.firstName} {a.teacherId?.lastName}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this teaching assignment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {a.teacherId?.firstName} {a.teacherId?.lastName} will no longer have access to {a.classId?.name} {a.sectionId?.name}'s
                              {" "}{a.subjectId?.name} attendance, assignments, materials, or exam marks.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(a._id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Link2}
              title={assignments?.length ? "No assignments match these filters" : "No teaching assignments yet"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
