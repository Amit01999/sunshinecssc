import { ReactNode } from "react";
import {
  LayoutDashboard,
  UserRound,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Bell,
  LifeBuoy,
  Users,
  Wallet,
} from "lucide-react";
import { DashboardLayout, NavSection } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { ChildSwitcher } from "./ChildSwitcher";

const studentNavSections: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/portal", icon: LayoutDashboard },
      { label: "Profile", href: "/portal/profile", icon: UserRound },
      { label: "Attendance", href: "/portal/attendance", icon: CalendarCheck },
      { label: "Classes & Materials", href: "/portal/classes", icon: BookOpen },
      { label: "Assignments", href: "/portal/assignments", icon: ClipboardList },
      { label: "Results", href: "/portal/results", icon: GraduationCap },
      { label: "Notices & Events", href: "/portal/notices", icon: Bell },
      { label: "Support", href: "/portal/support", icon: LifeBuoy },
    ],
  },
];

// Distinct, grouped navigation for parents - same underlying pages as the student portal
// (reused, not duplicated), but organized and labeled around "my child" rather than "me".
const parentNavSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Parent Dashboard", href: "/portal", icon: LayoutDashboard }],
  },
  {
    label: "My Children",
    items: [{ label: "Linked Children", href: "/portal/children", icon: Users }],
  },
  {
    label: "Academic Progress",
    items: [
      { label: "Attendance", href: "/portal/attendance", icon: CalendarCheck },
      { label: "Examination Results", href: "/portal/results", icon: GraduationCap },
      { label: "Assignments", href: "/portal/assignments", icon: ClipboardList },
      { label: "Class Information", href: "/portal/classes", icon: BookOpen },
      { label: "Fees & Payments", href: "/portal/fees", icon: Wallet },
    ],
  },
  {
    label: "School Communication",
    items: [
      { label: "Notices & Announcements", href: "/portal/notices", icon: Bell },
      { label: "Support", href: "/portal/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Parent Profile", href: "/portal/profile", icon: UserRound }],
  },
];

export function PortalLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const isParent = user?.role === "parent";

  return (
    <DashboardLayout
      title={title}
      navSections={isParent ? parentNavSections : studentNavSections}
      portalLabel={isParent ? "Parent Portal" : "Student Portal"}
    >
      {isParent && <ChildSwitcher />}
      {children}
    </DashboardLayout>
  );
}
