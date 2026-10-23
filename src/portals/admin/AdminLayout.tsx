import { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  FileCheck2,
  Image,
  Newspaper,
  Bell,
  Settings,
  Home,
  Landmark,
  UserRound,
  Mail,
  MessageSquare,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { DashboardLayout, NavSection } from "@/components/dashboard/DashboardLayout";

const navSections: NavSection[] = [
  {
    label: "School Operations",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Users & Access", href: "/admin/users", icon: Users },
      { label: "Academics", href: "/admin/academics", icon: GraduationCap },
      { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
      { label: "Examinations", href: "/admin/examinations", icon: FileCheck2 },
      { label: "Results", href: "/admin/results", icon: BarChart3 },
      { label: "Admissions", href: "/admin/admissions", icon: Landmark },
      { label: "Contact Messages", href: "/admin/contact-messages", icon: Mail },
      { label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare },
      { label: "Leave Applications", href: "/admin/leave-applications", icon: ClipboardList },
    ],
  },
  {
    label: "Website (CMS)",
    items: [
      { label: "Homepage", href: "/admin/cms/homepage", icon: Home },
      { label: "Notices & Events", href: "/admin/cms/notices", icon: Bell },
      { label: "News & Media", href: "/admin/cms/news", icon: Newspaper },
      { label: "Gallery", href: "/admin/cms/gallery", icon: Image },
      { label: "Site Settings", href: "/admin/cms/settings", icon: Settings },
    ],
  },
  {
    items: [{ label: "My Profile", href: "/admin/profile", icon: UserRound }],
  },
];

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DashboardLayout title={title} navSections={navSections} portalLabel="Admin Dashboard">
      {children}
    </DashboardLayout>
  );
}
