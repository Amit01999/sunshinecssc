import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarClock, ClipboardCheck, FileClock, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Overview() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const { data } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data,
  });

  if (!isTeacher) {
    return (
      <div>
        <PageHeader title="Welcome" description="Your staff dashboard." />
        <EmptyState icon={BookOpen} title="No teaching assignments" description="Use Communication and Profile & Leave from the sidebar." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Welcome back" description="Here's your teaching overview for today." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Teaching Assignments" value={data?.assignments?.length ?? 0} icon={BookOpen} />
        <StatCard label="Today's Classes" value={data?.todayTimetable?.length ?? 0} icon={CalendarClock} />
        <StatCard label="Pending Grading" value={data?.pendingGrading ?? 0} icon={ClipboardCheck} />
        <StatCard label="Upcoming Exams" value={data?.upcomingExaminations?.length ?? 0} icon={GraduationCap} />
      </div>

      {Boolean(data?.pendingStudentLeaveRequests) && (
        <Link
          to="/staff-portal/student-leave"
          className="flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-6 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <FileClock className="w-4 h-4 shrink-0" />
          {data.pendingStudentLeaveRequests} pending leave request{data.pendingStudentLeaveRequests === 1 ? "" : "s"} from your students
          — click to view.
        </Link>
      )}

      {Boolean(data?.rejectedResults) && (
        <Link
          to="/staff-portal/examinations"
          className="flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-6 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {data.rejectedResults} exam result{data.rejectedResults === 1 ? "" : "s"} rejected by admin — click to review and resubmit.
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.todayTimetable?.length ? (
            <ul className="space-y-2">
              {data.todayTimetable.map((s: any) => (
                <li key={s._id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span>
                    {s.startTime}–{s.endTime} · {s.subjectId?.name}
                  </span>
                  <span className="text-gray-500">
                    {s.classId?.name} {s.sectionId?.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No classes scheduled for today ({DAYS[new Date().getDay()]}).</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
