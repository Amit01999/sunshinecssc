import { ReactNode } from "react";
import { LayoutDashboard, Users, CalendarCheck, BookOpen, ClipboardList, GraduationCap, MessageSquare, UserRound, FileClock } from "lucide-react";
import { DashboardLayout, NavSection } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

export function StaffLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const teachingItems = isTeacher
    ? [
        { label: "My Students", href: "/staff-portal/students", icon: Users },
        { label: "Attendance", href: "/staff-portal/attendance", icon: CalendarCheck },
        { label: "Classes & Materials", href: "/staff-portal/classes", icon: BookOpen },
        { label: "Assignments", href: "/staff-portal/assignments", icon: ClipboardList },
        { label: "Examinations", href: "/staff-portal/examinations", icon: GraduationCap },
        { label: "Student Leave", href: "/staff-portal/student-leave", icon: FileClock },
      ]
    : [];

  const navSections: NavSection[] = [
    {
      items: [
        { label: "Overview", href: "/staff-portal", icon: LayoutDashboard },
        ...teachingItems,
        { label: "Communication", href: "/staff-portal/communication", icon: MessageSquare },
        { label: "Profile & Leave", href: "/staff-portal/profile", icon: UserRound },
      ],
    },
  ];

  return (
    <DashboardLayout title={title} navSections={navSections} portalLabel="Teachers & Staff Portal">
      {children}
    </DashboardLayout>
  );
}
