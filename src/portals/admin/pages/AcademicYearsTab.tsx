import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, CheckCircle2, GraduationCap } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AcademicYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

function yearStatus(y: AcademicYear): { label: string; variant: "default" | "secondary" | "outline" } {
  if (y.isActive) return { label: "Active", variant: "default" };
  const now = Date.now();
  if (new Date(y.endDate).getTime() < now) return { label: "Completed", variant: "secondary" };
  if (new Date(y.startDate).getTime() > now) return { label: "Upcoming", variant: "outline" };
  return { label: "Inactive", variant: "outline" };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AcademicYearsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: years } = useQuery<AcademicYear[]>({
    queryKey: ["years"],
    queryFn: async () => (await api.get("/academic-years")).data.data,
  });
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.data,
  });

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pendingActivate, setPendingActivate] = useState<AcademicYear | null>(null);

  const dateRangeInvalid = Boolean(startDate && endDate && endDate <= startDate);

  const create = useMutation({
    mutationFn: async () => api.post("/academic-years", { name, startDate, endDate }),
    onSuccess: () => {
      toast({ title: "Academic year created" });
      setName("");
      setStartDate("");
      setEndDate("");
      qc.invalidateQueries({ queryKey: ["years"] });
    },
    onError: (err) => toast({ title: "Could not create academic year", description: getErrorMessage(err), variant: "destructive" }),
  });

  const activate = useMutation({
    mutationFn: async (id: string) => api.post(`/academic-years/${id}/activate`),
    onSuccess: (_res, id) => {
      const year = years?.find((y) => y._id === id);
      toast({ title: `${year?.name ?? "Year"} is now the active academic year` });
      qc.invalidateQueries({ queryKey: ["years"] });
      setPendingActivate(null);
    },
    onError: (err) => toast({ title: "Could not activate", description: getErrorMessage(err), variant: "destructive" }),
  });

  const classCount = (yearId: string) => (classes ?? []).filter((c: any) => c.academicYearId === yearId || c.academicYearId?._id === yearId).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 max-w-2xl">
        An academic year defines the period that classes, sections, enrollments, teaching assignments, timetables,
        attendance, and examinations belong to. Activating a different year does not delete or change past records —
        each year's history stays exactly as it was.
      </p>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Create Academic Year</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="year-name">Name</Label>
              <Input id="year-name" placeholder="e.g. 2026 or 2026-2027" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="year-start">Start date</Label>
                <Input id="year-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="year-end">End date</Label>
                <Input id="year-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {dateRangeInvalid && <p className="text-xs text-red-600">End date must be after the start date.</p>}
            <Button
              className="w-full"
              onClick={() => create.mutate()}
              disabled={!name || !startDate || !endDate || dateRangeInvalid || create.isPending}
            >
              {create.isPending ? "Creating…" : "Create Academic Year"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">All Academic Years</CardTitle></CardHeader>
          <CardContent className="p-0">
            {years?.length ? (
              <div className="divide-y">
                {[...years]
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((y) => {
                    const status = yearStatus(y);
                    return (
                      <div key={y._id} className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${y.isActive ? "bg-[hsl(208,89%,40%)]/10 text-[hsl(208,89%,40%)]" : "bg-gray-100 text-gray-400"}`}>
                            <CalendarRange className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-800">{y.name}</span>
                              <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(y.startDate)} – {formatDate(y.endDate)}
                              <span className="mx-1.5">·</span>
                              {classCount(y._id)} class{classCount(y._id) === 1 ? "" : "es"}
                            </p>
                          </div>
                        </div>
                        {y.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-[hsl(208,89%,40%)] font-medium shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="shrink-0" onClick={() => setPendingActivate(y)}>
                            Set Active
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <EmptyState icon={GraduationCap} title="No academic years yet" description="Create your first academic year to start configuring classes and sections." />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(pendingActivate)} onOpenChange={(v) => !v && setPendingActivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set "{pendingActivate?.name}" as the active academic year?</AlertDialogTitle>
            <AlertDialogDescription>
              New classes, enrollments, and other academic records will default to this year going forward. The
              currently active year will no longer be marked active, but all of its records — enrollments,
              attendance, timetables, and results — remain exactly as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingActivate && activate.mutate(pendingActivate._id)}>
              Set Active
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
