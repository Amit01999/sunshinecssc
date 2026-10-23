import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import { AdminLayout } from "./AdminLayout";
import Overview from "./pages/Overview";
import UsersPage from "./pages/Users";
import Academics from "./pages/Academics";
import AttendanceOversight from "./pages/AttendanceOversight";
import Examinations from "./pages/Examinations";
import Results from "./pages/Results";
import Admissions from "./pages/Admissions";
import ContactMessages from "./pages/ContactMessages";
import Inquiries from "./pages/Inquiries";
import LeaveApplications from "./pages/LeaveApplications";
import Profile from "./pages/Profile";
import Homepage from "./pages/cms/Homepage";
import NoticesEvents from "./pages/cms/NoticesEvents";
import News from "./pages/cms/News";
import Gallery from "./pages/cms/Gallery";
import SiteSettings from "./pages/cms/SiteSettings";

const ALLOWED = ["super_admin", "admin", "academic_admin"] as const;

function withLayout(title: string, element: JSX.Element) {
  return (
    <ProtectedRoute allowedRoles={[...ALLOWED]}>
      <AdminLayout title={title}>{element}</AdminLayout>
    </ProtectedRoute>
  );
}

export default function AdminPortalRoutes() {
  return (
    <Routes>
      <Route index element={withLayout("Overview", <Overview />)} />
      <Route path="users" element={withLayout("Users & Access", <UsersPage />)} />
      <Route path="academics" element={withLayout("Academic Management", <Academics />)} />
      <Route path="attendance" element={withLayout("Attendance", <AttendanceOversight />)} />
      <Route path="examinations" element={withLayout("Examinations", <Examinations />)} />
      <Route path="results" element={withLayout("Results", <Results />)} />
      <Route path="admissions" element={withLayout("Admissions", <Admissions />)} />
      <Route path="contact-messages" element={withLayout("Contact Messages", <ContactMessages />)} />
      <Route path="inquiries" element={withLayout("Inquiries", <Inquiries />)} />
      <Route path="leave-applications" element={withLayout("Leave Applications", <LeaveApplications />)} />
      <Route path="profile" element={withLayout("My Profile", <Profile />)} />
      <Route path="cms/homepage" element={withLayout("Homepage", <Homepage />)} />
      <Route path="cms/notices" element={withLayout("Notices & Events", <NoticesEvents />)} />
      <Route path="cms/news" element={withLayout("News & Media", <News />)} />
      <Route path="cms/gallery" element={withLayout("Gallery", <Gallery />)} />
      <Route path="cms/settings" element={withLayout("Site Settings", <SiteSettings />)} />
    </Routes>
  );
}
