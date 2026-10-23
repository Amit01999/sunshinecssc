import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, GraduationCap, Building2, CalendarCheck, FileCheck2, Landmark, ClipboardList, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data,
  });

  return (
    <div>
      <PageHeader title="School Overview" description="Live statistics calculated from the database." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students" value={data?.totals?.students ?? 0} icon={Users} />
        <StatCard label="Parents" value={data?.totals?.parents ?? 0} icon={Users} />
        <StatCard label="Teachers" value={data?.totals?.teachers ?? 0} icon={GraduationCap} />
        <StatCard label="Staff" value={data?.totals?.staff ?? 0} icon={Users} />
        <StatCard label="Classes" value={data?.totals?.classes ?? 0} icon={Building2} />
        <StatCard label="Departments" value={data?.totals?.departments ?? 0} icon={Building2} />
        <StatCard
          label="Present Today"
          value={data?.todayAttendance?.present ?? 0}
          icon={CalendarCheck}
          hint={`Absent: ${data?.todayAttendance?.absent ?? 0}`}
        />
        <StatCard label="Pending Result Approvals" value={data?.pending?.resultApprovals ?? 0} icon={FileCheck2} />
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Admissions" value={data?.pending?.admissions ?? 0} icon={Landmark} />
        <Link to="/admin/leave-applications" className="block hover:opacity-90 transition-opacity">
          <StatCard
            label="Pending Leave Requests"
            value={data?.pending?.leaveApplications ?? 0}
            icon={ClipboardList}
            hint="Click to review"
          />
        </Link>
        <StatCard label="Upcoming Events" value={data?.upcomingEvents?.length ?? 0} icon={CalendarCheck} />
        <Link to="/admin/users" className="block hover:opacity-90 transition-opacity">
          <StatCard
            label="Pending First Login"
            value={data?.pending?.firstLogin ?? 0}
            icon={KeyRound}
            hint="Click to view & re-issue passwords"
          />
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Examinations</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingExaminations?.length ? (
              <ul className="space-y-2">
                {data.upcomingExaminations.map((e: any) => (
                  <li key={e._id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span>{e.name}</span>
                    <Badge variant="outline" className="capitalize">{e.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">None scheduled.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Admin Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentActivity?.length ? (
              <ul className="space-y-2">
                {data.recentActivity.map((a: any) => (
                  <li key={a._id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className="text-gray-700">{a.action}</span>{" "}
                    <span className="text-gray-400">· {a.actorId?.email ?? "system"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
