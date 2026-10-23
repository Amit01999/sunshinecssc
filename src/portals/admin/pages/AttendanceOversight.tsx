import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw, Search, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { AttendanceStatusBadge } from "@/components/dashboard/AttendanceStatusBadge";
import { AttendanceCalendarLegend, DayAttendance, MonthAttendanceCalendar } from "@/components/dashboard/MonthAttendanceCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ALL = "__all__";

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function fmtLong(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

interface ClassSectionRow {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  enrolled: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface AdminSummary {
  totalEnrolled: number;
  counts: { present: number; absent: number; late: number; excused: number };
  attendanceRate: number;
  byClassSection: ClassSectionRow[];
  byDate: { date: string; present: number; absent: number; late: number; excused: number }[];
}

function recordingStatus(row: ClassSectionRow): { label: string; variant: "default" | "secondary" | "outline" } {
  const recorded = row.present + row.absent + row.late + row.excused;
  if (recorded === 0) return { label: "Not Recorded", variant: "outline" };
  if (recorded >= row.enrolled) return { label: "Recorded", variant: "default" };
  return { label: "Partial", variant: "secondary" };
}

function useAdminSummary(academicYearId: string | undefined, from: string, to: string, classId?: string, sectionId?: string) {
  return useQuery<AdminSummary>({
    queryKey: ["attendance-admin-summary", academicYearId, from, to, classId, sectionId],
    enabled: Boolean(academicYearId && from && to),
    queryFn: async () =>
      (
        await api.get("/attendance/admin-summary", {
          params: { academicYearId, from, to, classId: classId || undefined, sectionId: sectionId || undefined },
        })
      ).data.data,
  });
}

/* ---------------------------------------------------------------------- */
/* Daily overview                                                          */
/* ---------------------------------------------------------------------- */

function DailyOverview({ academicYearId }: { academicYearId: string | undefined }) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [coverageSearch, setCoverageSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<ClassSectionRow | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>();
  const qc = useQueryClient();

  const dateStr = localDateStr(selectedDate);
  const { data: summary, isLoading, isFetching } = useAdminSummary(academicYearId, dateStr, dateStr);

  useEffect(() => setSelectedRow(null), [academicYearId, dateStr]);

  const filteredRows = (summary?.byClassSection ?? []).filter((r) => {
    if (!coverageSearch) return true;
    const q = coverageSearch.toLowerCase();
    return r.className.toLowerCase().includes(q) || r.sectionName.toLowerCase().includes(q);
  });

  const recordedSections = (summary?.byClassSection ?? []).filter((r) => r.present + r.absent + r.late + r.excused > 0).length;
  const totalSections = summary?.byClassSection.length ?? 0;

  const { data: studentRecords, isLoading: loadingDetails } = useQuery({
    queryKey: ["attendance-admin-details", selectedRow?.classId, selectedRow?.sectionId, dateStr],
    enabled: Boolean(selectedRow),
    queryFn: async () =>
      (
        await api.get("/attendance", {
          params: { classId: selectedRow!.classId, sectionId: selectedRow!.sectionId, from: dateStr, to: dateStr },
        })
      ).data.data as any[],
  });

  const filteredDetails = (studentRecords ?? []).filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      const name = `${r.studentId?.firstName ?? ""} ${r.studentId?.lastName ?? ""}`.toLowerCase();
      if (!name.includes(q) && !r.studentId?.rollNumber?.toLowerCase().includes(q) && !r.studentId?.studentCode?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["attendance-admin-summary"] });
    qc.invalidateQueries({ queryKey: ["attendance-admin-details"] });
  };

  const isFuture = selectedDate > startOfDay(new Date());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[220px]">{fmtLong(selectedDate)}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={isFuture || localDateStr(selectedDate) === localDateStr(new Date())}
            onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedDate(startOfDay(new Date()))}>Today</Button>
          <Input
            type="date"
            className="w-40 h-8 text-sm"
            value={dateStr}
            max={localDateStr(new Date())}
            onChange={(e) => e.target.value && setSelectedDate(startOfDay(new Date(`${e.target.value}T00:00:00`)))}
          />
          <Button size="sm" variant="outline" className="ml-auto" onClick={refresh} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {!academicYearId ? (
        <EmptyState icon={CalendarCheck} title="Select an academic year to view attendance" />
      ) : isFuture ? (
        <EmptyState icon={CalendarCheck} title="This date is in the future" description="Attendance can only be recorded for today or a past date." />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Students" value={summary?.totalEnrolled ?? 0} icon={Users} />
            <StatCard label="Present" value={summary?.counts.present ?? 0} icon={CalendarCheck} />
            <StatCard label="Absent" value={summary?.counts.absent ?? 0} icon={CalendarCheck} />
            <StatCard label="Late" value={summary?.counts.late ?? 0} icon={CalendarCheck} />
            <StatCard
              label="Attendance Rate"
              value={`${summary?.attendanceRate ?? 0}%`}
              icon={CalendarCheck}
              hint={`${recordedSections}/${totalSections} sections recorded`}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daily Attendance Coverage</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-8 h-8 text-sm" placeholder="Search class or section…" value={coverageSearch} onChange={(e) => setCoverageSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r) => {
                      const recorded = r.present + r.absent + r.late + r.excused;
                      const rate = recorded > 0 ? Math.round(((r.present + r.late) / recorded) * 1000) / 10 : null;
                      const status = recordingStatus(r);
                      const isSelected = selectedRow?.classId === r.classId && selectedRow?.sectionId === r.sectionId;
                      return (
                        <TableRow
                          key={`${r.classId}:${r.sectionId}`}
                          data-state={isSelected ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelectedRow(isSelected ? null : r)}
                        >
                          <TableCell className="font-medium text-gray-800">{r.className}</TableCell>
                          <TableCell>{r.sectionName}</TableCell>
                          <TableCell className="text-gray-500">{r.enrolled}</TableCell>
                          <TableCell className="text-emerald-600">{r.present}</TableCell>
                          <TableCell className="text-red-600">{r.absent}</TableCell>
                          <TableCell className="text-amber-600">{r.late}</TableCell>
                          <TableCell className="text-gray-500">{rate !== null ? `${rate}%` : "—"}</TableCell>
                          <TableCell><Badge variant={status.variant} className="text-[10px]">{status.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Users} title={summary?.byClassSection.length ? "No sections match your search" : "No classes with enrolled students for this year"} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base">
                  Student Attendance Details
                  {selectedRow && <span className="text-gray-400 font-normal"> — {selectedRow.className} {selectedRow.sectionName}</span>}
                </CardTitle>
                {selectedRow && (
                  <div className="flex gap-2">
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      <Input className="pl-8 h-8 text-sm" placeholder="Name or roll…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    </div>
                    <Select value={statusFilter ?? ALL} onValueChange={(v) => setStatusFilter(v === ALL ? undefined : v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        {["present", "absent", "late", "excused"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedRow ? (
                <EmptyState icon={Users} title="Select a class & section above" description="Click a row in the coverage table to inspect individual student records." />
              ) : loadingDetails ? (
                <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
              ) : filteredDetails.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Recorded by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((r: any) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium text-gray-800">{r.studentId?.firstName} {r.studentId?.lastName}</TableCell>
                        <TableCell className="text-gray-500">{r.studentId?.rollNumber ?? "—"}</TableCell>
                        <TableCell><AttendanceStatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-gray-500">{r.remarks ?? "—"}</TableCell>
                        <TableCell className="text-gray-400 text-xs">{r.markedBy?.email ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Users} title="No attendance recorded for this section yet" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Monthly report                                                          */
/* ---------------------------------------------------------------------- */

function MonthlyReport({ academicYearId }: { academicYearId: string | undefined }) {
  const [month, setMonth] = useState(() => new Date());
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data });
  const { data: sections } = useQuery({
    queryKey: ["sections-for-report", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });

  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const monthEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);
  const { data: summary, isLoading } = useAdminSummary(academicYearId, localDateStr(monthStart), localDateStr(monthEnd), classId, sectionId);

  const statusByDate = useMemo(() => {
    const map = new Map<string, DayAttendance>();
    for (const d of summary?.byDate ?? []) {
      map.set(d.date, { present: d.present, absent: d.absent, late: d.late, excused: d.excused });
    }
    return map;
  }, [summary]);

  useEffect(() => setSectionId(undefined), [classId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-gray-500">Month</Label>
            <Input
              type="month"
              className="w-40"
              value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
              max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split("-").map(Number);
                setMonth(new Date(y, m - 1, 1));
              }}
            />
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-gray-500">Class (optional)</Label>
            <Select value={classId ?? ALL} onValueChange={(v) => setClassId(v === ALL ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px]">
            <Label className="text-xs text-gray-500">Section (optional)</Label>
            <Select value={sectionId ?? ALL} onValueChange={(v) => setSectionId(v === ALL ? undefined : v)} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sections</SelectItem>
                {(sections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!academicYearId ? (
        <EmptyState icon={CalendarCheck} title="Select an academic year to view the monthly report" />
      ) : isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Attendance Rate" value={`${summary?.attendanceRate ?? 0}%`} icon={CalendarCheck} />
              <StatCard label="Present" value={summary?.counts.present ?? 0} icon={CalendarCheck} />
              <StatCard label="Absent" value={summary?.counts.absent ?? 0} icon={CalendarCheck} />
              <StatCard label="Late" value={summary?.counts.late ?? 0} icon={CalendarCheck} />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">By Class / Section</CardTitle></CardHeader>
              <CardContent className="p-0">
                {summary?.byClassSection.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.byClassSection.map((r) => (
                        <TableRow key={`${r.classId}:${r.sectionId}`}>
                          <TableCell className="font-medium text-gray-800">{r.className}</TableCell>
                          <TableCell>{r.sectionName}</TableCell>
                          <TableCell className="text-emerald-600">{r.present}</TableCell>
                          <TableCell className="text-red-600">{r.absent}</TableCell>
                          <TableCell className="text-amber-600">{r.late}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState icon={CalendarCheck} title="No attendance recorded this month" />
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Daily Trend</CardTitle></CardHeader>
            <CardContent className="p-0">
              <MonthAttendanceCalendar month={month} onMonthChange={setMonth} statusByDate={statusByDate} onSelect={() => {}} />
              <AttendanceCalendarLegend />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Correction requests (existing workflow, preserved)                      */
/* ---------------------------------------------------------------------- */

function CorrectionRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["attendance-corrections"],
    queryFn: async () => (await api.get("/attendance/corrections", { params: { status: "pending" } })).data.data,
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      api.post(`/attendance/corrections/${id}/review`, { status }),
    onSuccess: () => {
      toast({ title: "Reviewed" });
      qc.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pending Correction Requests</CardTitle></CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Loading…</p>
        ) : requests?.length ? (
          <div className="divide-y">
            {requests.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between p-4">
                <div className="text-sm">
                  <p className="text-gray-700">
                    {new Date(r.attendanceId?.date).toLocaleDateString()} → <Badge variant="outline" className="capitalize">{r.requestedStatus}</Badge>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">By {r.requestedBy?.email} — {r.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r._id, status: "rejected" })}>Reject</Button>
                  <Button size="sm" onClick={() => review.mutate({ id: r._id, status: "approved" })}>Approve</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarCheck} title="No pending correction requests" />
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Page                                                                     */
/* ---------------------------------------------------------------------- */

export default function AttendanceOversight() {
  const { data: years } = useQuery({ queryKey: ["years"], queryFn: async () => (await api.get("/academic-years")).data.data });
  const [academicYearId, setAcademicYearId] = useState<string>();

  useEffect(() => {
    if (!academicYearId && years?.length) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [years, academicYearId]);

  return (
    <div>
      <PageHeader
        title="Attendance Overview"
        description="Monitor daily attendance across classes and review attendance records."
        actions={
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Academic year" /></SelectTrigger>
            <SelectContent>
              {(years ?? []).map((y: any) => <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <Tabs defaultValue="daily">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Daily Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="corrections">Correction Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><DailyOverview academicYearId={academicYearId} /></TabsContent>
        <TabsContent value="monthly"><MonthlyReport academicYearId={academicYearId} /></TabsContent>
        <TabsContent value="corrections"><CorrectionRequests /></TabsContent>
      </Tabs>
    </div>
  );
}
