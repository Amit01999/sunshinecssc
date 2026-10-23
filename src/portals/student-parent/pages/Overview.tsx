import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { CalendarCheck, GraduationCap, ClipboardList, Bell, Users, BookOpen, ArrowRight, Hash, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { portalBase } from "@/components/dashboard/portalBase";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useStudentScope } from "../useStudentScope";

interface ChildRef {
  firstName: string;
  lastName: string;
  studentCode?: string;
  rollNumber?: string;
  classId?: { name?: string };
  sectionId?: { name?: string };
}

interface SummaryData {
  // Student's own dashboard shape.
  student?: ChildRef;
  // Parent dashboard shape.
  hasChildren?: boolean;
  children?: ChildRef[];
  selectedChildId?: string | null;
  attendancePercentage: number;
  upcomingExaminations: { _id: string; name: string; examType: string }[];
  pendingAssignments: { _id: string; title: string; dueDate: string }[];
  recentResults: { _id: string; marksObtained: number; grade: string; subjectId?: { name?: string } }[];
  notices: { _id: string; title: string; isPinned: boolean; createdAt: string }[];
}

function childName(c?: ChildRef) {
  if (!c) return "";
  return `${c.firstName} ${c.lastName}`.trim();
}

function childInitials(c?: ChildRef) {
  if (!c) return "?";
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase();
}

export default function Overview() {
  const { user } = useAuth();
  const { studentId, ready, isParent, hasChildren } = useStudentScope();
  const location = useLocation();
  const base = portalBase(location.pathname);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-overview", studentId],
    enabled: ready,
    queryFn: async () => {
      const params = isParent && studentId ? { studentId } : undefined;
      const res = await api.get("/dashboard/summary", { params });
      return res.data.data as SummaryData;
    },
  });

  if (!ready) {
    return <EmptyState icon={CalendarCheck} title="Select a child above to view their dashboard" />;
  }

  if (isParent && !hasChildren) {
    return (
      <div>
        <PageHeader title="Parent Dashboard" description="Your academic overview for your linked child." />
        <EmptyState
          icon={Users}
          title="No student is linked to your parent account yet"
          description="Please contact the school administrator to link your child. Once linked, their attendance, results, and school updates will appear here."
        />
      </div>
    );
  }

  // The selected child's full academic info comes back as `student` on the payload for both
  // roles (it's just "my own profile" for a student, or "the selected child" for a parent).
  const selectedChild = data?.student;

  const quickLinks = [
    { label: "Attendance", href: `${base}/attendance`, icon: CalendarCheck },
    { label: "Results", href: `${base}/results`, icon: GraduationCap },
    { label: "Assignments", href: `${base}/assignments`, icon: ClipboardList },
    { label: "Classes & Timetable", href: `${base}/classes`, icon: BookOpen },
  ];

  return (
    <div>
      {isParent ? (
        <>
          <PageHeader
            title="Parent Dashboard"
            description={
              selectedChild
                ? `Here's how ${childName(selectedChild)} is doing.`
                : "Here's your child's academic overview."
            }
          />

          <Card className="mb-6">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="text-base" style={{ backgroundColor: "hsl(208,89%,40%)", color: "white" }}>
                  {childInitials(selectedChild)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 text-lg">{childName(selectedChild) || "Your child"}</p>
                  {(data?.children?.length ?? 0) > 1 && (
                    <Badge variant="outline" className="text-[10px]">
                      Viewing 1 of {data?.children?.length} children — switch above
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap mt-1 text-xs text-gray-500">
                  {selectedChild?.studentCode && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {selectedChild.studentCode}
                    </span>
                  )}
                  {selectedChild?.classId?.name && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {selectedChild.classId.name}
                      {selectedChild.sectionId?.name ? ` — ${selectedChild.sectionId.name}` : ""}
                    </span>
                  )}
                  {selectedChild?.rollNumber && <span>Roll {selectedChild.rollNumber}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <PageHeader
          title={`Welcome back${selectedChild ? `, ${selectedChild.firstName}` : ""}`}
          description="Here's what's happening with your academics."
        />
      )}

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load dashboard data right now. Please try again later.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={isParent ? "Child's Attendance" : "Attendance"}
          value={isError ? "Unavailable" : isLoading ? "…" : `${data?.attendancePercentage ?? 0}%`}
          icon={CalendarCheck}
          hint={isError ? "Could not load attendance data" : undefined}
        />
        <StatCard label="Upcoming Exams" value={data?.upcomingExaminations?.length ?? 0} icon={GraduationCap} />
        <StatCard label="Pending Assignments" value={data?.pendingAssignments?.length ?? 0} icon={ClipboardList} />
        <StatCard label="Recent Notices" value={data?.notices?.length ?? 0} icon={Bell} />
      </div>

      {isParent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className="flex items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-gray-700 hover:border-[hsl(208,89%,70%)] hover:bg-[hsl(208,89%,97%)] transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <l.icon className="w-4 h-4 shrink-0 text-[hsl(208,89%,40%)]" />
                <span className="truncate">{l.label}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : data?.recentResults?.length ? (
              <ul className="space-y-2">
                {data.recentResults.map((r) => (
                  <li key={r._id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className="text-gray-700">{r.subjectId?.name ?? "Subject"}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-500">{r.marksObtained}</span>
                      <Badge variant="secondary">{r.grade}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No published results yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Examinations</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingExaminations?.length ? (
              <ul className="space-y-2">
                {data.upcomingExaminations.map((e) => (
                  <li key={e._id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className="text-gray-700">{e.name}</span>
                    <Badge variant="outline">{e.examType}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No upcoming examinations scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
