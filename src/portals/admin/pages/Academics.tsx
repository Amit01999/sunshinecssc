import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarRange, GraduationCap, Layers, Link2, ListChecks, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import AcademicYearsTab from "./AcademicYearsTab";
import SubjectsTab from "./SubjectsTab";
import ClassesTab from "./ClassesTab";
import TeachingAssignmentsTab from "./TeachingAssignmentsTab";
import TimetableTab from "./TimetableTab";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Department {
  _id: string;
  name: string;
  slug: string;
  isPublished: boolean;
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function useList(path: string, key: string, params?: Record<string, unknown>) {
  return useQuery({ queryKey: [key, params], queryFn: async () => (await api.get(path, { params })).data.data });
}

function DepartmentDialog({
  open,
  onOpenChange,
  department,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  department: Department | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(department);
  const [name, setName] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (open) {
      setName(department?.name ?? "");
      setIsPublished(department?.isPublished ?? true);
    }
  }, [open, department]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, slug: slugify(name), isPublished };
      return isEdit ? api.patch(`/departments/${department!._id}`, body) : api.post("/departments", body);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Department updated" : "Department created" });
      onOpenChange(false);
      onSaved();
    },
    onError: (err) => toast({ title: "Could not save department", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="dept-name">Department name</Label>
            <Input id="dept-name" placeholder="e.g. Science" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPublished} onCheckedChange={(v) => setIsPublished(Boolean(v))} />
            Published on the public website
          </label>
          <p className="text-xs text-gray-400">
            This appears on the public website's "Our Departments" page. Looking for academic streams like Science,
            Humanities, or Business Studies instead? Manage those under Classes & Sections → Academic Groups.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: departments } = useQuery<Department[]>({ queryKey: ["departments"], queryFn: async () => (await api.get("/departments")).data.data });
  const [dialogDept, setDialogDept] = useState<Department | null | undefined>(undefined);

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast({ title: "Department deleted" });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => toast({ title: "Could not delete department", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50/40 border-blue-100">
        <CardContent className="p-4 text-sm text-gray-600">
          <strong className="text-gray-800">Departments</strong> power the public website's "Our Departments" page —
          they're organizational/marketing content, not an academic rule. For academic streams such as{" "}
          <strong className="text-gray-800">Science, Humanities, or Business Studies</strong> that restrict which
          subjects apply to which classes, use <strong className="text-gray-800">Academic Groups</strong> under the
          Classes & Sections tab instead.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Departments</CardTitle>
          <Button size="sm" onClick={() => setDialogDept(null)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Department
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {departments?.length ? (
            <div className="divide-y">
              {departments.map((d) => (
                <div key={d._id} className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-gray-800">{d.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={d.isPublished ? "default" : "secondary"}>{d.isPublished ? "Published" : "Hidden"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setDialogDept(d)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{d.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes it from the public "Our Departments" page immediately. Subjects or teachers
                            linked to this department will keep their link, but it will no longer resolve to a
                            department.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(d._id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Building2} title="No departments yet" />}
        </CardContent>
      </Card>

      <DepartmentDialog
        open={dialogDept !== undefined}
        onOpenChange={(v) => !v && setDialogDept(undefined)}
        department={dialogDept ?? null}
        onSaved={() => qc.invalidateQueries({ queryKey: ["departments"] })}
      />
    </div>
  );
}

const TABS = [
  { value: "years", label: "Academic Years", icon: CalendarRange },
  { value: "departments", label: "Departments", icon: Building2 },
  { value: "subjects", label: "Subjects", icon: ListChecks },
  { value: "classes", label: "Classes & Sections", icon: Layers },
  { value: "assignments", label: "Teaching Assignments", icon: Link2 },
  { value: "timetable", label: "Timetable", icon: Table2 },
];

export default function Academics() {
  const { data: years } = useList("/academic-years", "years");
  const activeYear = (years ?? []).find((y: any) => y.isActive);

  return (
    <div>
      <PageHeader
        title="Academic Management"
        description="Manage academic years, classes, subjects, teaching assignments, and timetables from one place."
        actions={
          activeYear ? (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs font-normal border-[hsl(208,89%,40%)]/30 text-[hsl(208,89%,40%)] bg-[hsl(208,89%,40%)]/5">
              <GraduationCap className="w-3.5 h-3.5" /> Active year: {activeYear.name}
            </Badge>
          ) : undefined
        }
      />
      <Tabs defaultValue="years">
        <TabsList className="mb-5 flex-wrap h-auto gap-1 bg-gray-100/80 p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 data-[state=active]:shadow-sm">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="years"><AcademicYearsTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="subjects"><SubjectsTab /></TabsContent>
        <TabsContent value="classes"><ClassesTab /></TabsContent>
        <TabsContent value="assignments"><TeachingAssignmentsTab /></TabsContent>
        <TabsContent value="timetable"><TimetableTab /></TabsContent>
      </Tabs>
    </div>
  );
}
