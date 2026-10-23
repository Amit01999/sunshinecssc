import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { AttendanceStatus, AttendanceStatusBadge } from "@/components/dashboard/AttendanceStatusBadge";
import { AttendanceCalendarLegend, DayAttendance, MonthAttendanceCalendar, dayKey } from "@/components/dashboard/MonthAttendanceCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useStudentScope } from "../useStudentScope";

interface AcademicYearOption {
  _id: string;
  name: string;
  isActive: boolean;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  updatedAt: string;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function Attendance() {
  const { user } = useAuth();
  const { studentId, ready, isParent } = useStudentScope();
  // user.profile._id is only a valid student id for the student role themselves - for a parent
  // it's their own ParentProfile id, which must never be sent here as if it were a child's id
  // (e.g. a parent with zero linked children would otherwise query a nonsense "student").
  const effectiveId = studentId ?? (!isParent ? (user?.profile?._id as string | undefined) : undefined);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | undefined>();
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>();

  const { data: yearOptions } = useQuery({
    queryKey: ["attendance-years", effectiveId],
    enabled: ready && Boolean(effectiveId),
    queryFn: async () =>
      (await api.get(`/attendance/student/${effectiveId}/years`)).data.data as {
        years: AcademicYearOption[];
        currentAcademicYearId: string | null;
      },
  });

  // Default the picker to the student's own current enrollment year once it's known - the
  // backend already defaults the summary itself the same way, this just keeps the dropdown
  // showing the right selection instead of appearing blank on first load.
  const activeYearId = selectedYearId ?? yearOptions?.currentAcademicYearId ?? undefined;

  const { data: summary, isError: summaryError } = useQuery({
    queryKey: ["attendance-summary", effectiveId, activeYearId],
    enabled: ready && Boolean(effectiveId),
    queryFn: async () =>
      (
        await api.get(`/attendance/student/${effectiveId}/summary`, {
          params: activeYearId ? { academicYearId: activeYearId } : undefined,
        })
      ).data.data,
  });

  const monthStart = useMemo(() => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), [calendarMonth]);
  const monthEnd = useMemo(() => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59), [calendarMonth]);

  const { data: monthRecords, isLoading } = useQuery({
    queryKey: ["attendance-records", studentId, monthStart.toISOString().slice(0, 7)],
    enabled: ready,
    queryFn: async () => {
      const params: Record<string, string> = { from: monthStart.toISOString(), to: monthEnd.toISOString() };
      if (studentId) params.studentId = studentId;
      const res = await api.get<{ data: AttendanceRecord[] }>("/attendance", { params });
      return res.data.data;
    },
  });

  const statusByDate = useMemo(() => {
    const map = new Map<string, DayAttendance>();
    for (const r of monthRecords ?? []) {
      const key = dayKey(new Date(r.date));
      const entry: DayAttendance = { present: 0, absent: 0, late: 0, excused: 0 };
      entry[r.status] = 1;
      map.set(key, entry);
    }
    return map;
  }, [monthRecords]);

  const sortedMonthRecords = useMemo(
    () => [...(monthRecords ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [monthRecords],
  );

  const selectedRecord = selected ? (monthRecords ?? []).find((r) => sameMonth(new Date(r.date), selected) && new Date(r.date).getDate() === selected.getDate()) : undefined;

  if (!ready) return <EmptyState icon={CalendarCheck} title="Select a child above to view attendance" />;

  const percentage = summary?.percentage ?? 0;
  const selectedYearName = yearOptions?.years.find((y) => y._id === activeYearId)?.name;
  const noDataForYear = !summaryError && summary && summary.total === 0;

  return (
    <div>
      <PageHeader
        title={isParent ? "Child's Attendance" : "My Attendance"}
        description={isParent ? "Your child's daily attendance record, recorded by their teachers." : "Your daily attendance record, recorded by your teachers."}
      />

      {summaryError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load your attendance summary right now. Please try again later.
        </div>
      )}

      {yearOptions && yearOptions.years.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Label className="text-xs text-gray-500 mb-1 block">Academic Year</Label>
          <Select value={activeYearId} onValueChange={setSelectedYearId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.years.map((y) => (
                <SelectItem key={y._id} value={y._id}>
                  {y.name}
                  {y._id === yearOptions.currentAcademicYearId ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">
            The summary below reflects the selected year. The calendar further down can still browse any month.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard
          label={`Recorded Days${selectedYearName ? ` (${selectedYearName})` : ""}`}
          value={summaryError ? "—" : summary?.total ?? 0}
          icon={CalendarCheck}
        />
        <StatCard label="Present" value={summaryError ? "—" : summary?.counts?.present ?? 0} icon={CalendarCheck} />
        <StatCard label="Absent" value={summaryError ? "—" : summary?.counts?.absent ?? 0} icon={CalendarCheck} />
        <StatCard
          label="Late / Excused"
          value={summaryError ? "—" : (summary?.counts?.late ?? 0) + (summary?.counts?.excused ?? 0)}
          icon={CalendarCheck}
        />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-4 h-4 text-[hsl(208,89%,40%)]" />
            <span className="text-sm font-semibold text-gray-800">
              Overall Attendance{selectedYearName ? ` (${selectedYearName})` : ""}:{" "}
              {summaryError ? "Unavailable" : noDataForYear ? "No attendance data yet" : `${percentage}%`}
            </span>
          </div>
          <Progress value={summaryError ? 0 : percentage} className="h-2.5" />
          <p className="text-xs text-gray-400 mt-2">
            {noDataForYear
              ? "No attendance has been recorded for this academic year yet."
              : "Calculated as (Present + Late) ÷ Total recorded days × 100, across every day your teachers recorded attendance in the selected academic year. Days that haven't been recorded yet are not counted as absent."}
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Monthly Calendar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MonthAttendanceCalendar
              month={calendarMonth}
              onMonthChange={(m) => { setCalendarMonth(m); setSelected(undefined); }}
              selected={selected}
              onSelect={setSelected}
              statusByDate={statusByDate}
            />
            <AttendanceCalendarLegend />
            {selected && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </span>
                {selectedRecord ? (
                  <AttendanceStatusBadge status={selectedRecord.status} />
                ) : (
                  <span className="text-xs text-gray-400">No record</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Attendance History — {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : sortedMonthRecords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMonthRecords.map((r) => {
                    const d = new Date(r.date);
                    return (
                      <TableRow key={r._id}>
                        <TableCell>{d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                        <TableCell className="text-gray-500">{d.toLocaleDateString(undefined, { weekday: "short" })}</TableCell>
                        <TableCell><AttendanceStatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-gray-500">{r.remarks ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance recorded this month"
                description="Records will appear here once your teacher marks attendance for this period."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
