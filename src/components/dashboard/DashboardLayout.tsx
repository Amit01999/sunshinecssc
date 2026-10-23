import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LucideIcon, Bell, LogOut, Settings, UserRound, ChevronDown } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import logo from "@/assets/images/logo.png";
import { portalBase } from "./portalBase";

const PRIMARY = "hsl(208,89%,40%)";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  academic_admin: "Academic Admin",
  teacher: "Teacher",
  staff: "Staff",
  student: "Student",
  parent: "Parent",
};

function initialsFor(email: string, profile: Record<string, unknown> | null) {
  const firstName = (profile?.firstName as string) ?? "";
  const lastName = (profile?.lastName as string) ?? "";
  if (firstName || lastName) return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function DashboardLayout({
  title,
  navSections,
  portalLabel,
  children,
}: {
  title: string;
  navSections: NavSection[];
  portalLabel: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .get("/notifications", { params: { unreadOnly: true } })
      .then((res) => setUnreadCount(res.data.meta?.unreadCount ?? 0))
      .catch(() => undefined);
  }, [location.pathname]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Sunshine logo" className="h-8 w-auto" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-gray-800">Sunshine CSSC</p>
              <p className="text-[10px] text-gray-500">{portalLabel}</p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {navSections.map((section, i) => (
            <SidebarGroup key={section.label ?? i}>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="p-3">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">
            &larr; Back to public site
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-gray-800 font-display">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/notice-and-events">View notices &amp; events</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: PRIMARY, color: "white" }} className="text-xs font-semibold">
                      {initialsFor(user.email, user.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-sm truncate">{user.email}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`${portalBase(location.pathname)}/profile`)}>
                  <UserRound className="w-4 h-4 mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`${portalBase(location.pathname)}/profile?tab=security`)}>
                  <Settings className="w-4 h-4 mr-2" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-57px)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
