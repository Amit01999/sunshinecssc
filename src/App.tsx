import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Unauthorized from "./pages/Unauthorized.tsx";
import FounderMessage from "./pages/FounderMessage.tsx";
import DirectorMessage from "./pages/DirectorMessage.tsx";
import HeadmasterMessage from "./pages/HeadmasterMessage.tsx";
import Classes from "./pages/Classes.tsx";
import Departments from "./pages/Departments.tsx";
import Teachers from "./pages/Teachers.tsx";
import NoticeEvents from "./pages/NoticeEvents.tsx";
import NewsMedia from "./pages/NewsMedia.tsx";
import ContactUs from "./pages/ContactUs.tsx";
import Admissions from "./pages/Admissions.tsx";
import GalleryPage from "./pages/GalleryPage.tsx";
import LoginStudents from "./pages/LoginStudents.tsx";
import LoginTeachers from "./pages/LoginTeachers.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

// Each dashboard is a large, rarely-visited-together bundle, so it's split out of the
// main chunk the public site ships on first load.
const PortalRoutes = lazy(() => import("./portals/student-parent/PortalRoutes.tsx"));
const StaffPortalRoutes = lazy(() => import("./portals/staff/StaffPortalRoutes.tsx"));
const AdminPortalRoutes = lazy(() => import("./portals/admin/AdminPortalRoutes.tsx"));

const queryClient = new QueryClient();

function DashboardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/message/founder" element={<FounderMessage />} />
            <Route path="/message/director" element={<DirectorMessage />} />
            <Route path="/message/headmaster" element={<HeadmasterMessage />} />
            <Route path="/academics/classes" element={<Classes />} />
            <Route path="/academics/departments" element={<Departments />} />
            <Route path="/academics/teachers" element={<Teachers />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/notice-and-events" element={<NoticeEvents />} />
            <Route path="/news-and-media" element={<NewsMedia />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/login/students" element={<LoginStudents />} />
            <Route path="/login/teachers" element={<LoginTeachers />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/portal/*"
              element={
                <Suspense fallback={<DashboardFallback />}>
                  <PortalRoutes />
                </Suspense>
              }
            />
            <Route
              path="/staff-portal/*"
              element={
                <Suspense fallback={<DashboardFallback />}>
                  <StaffPortalRoutes />
                </Suspense>
              }
            />
            <Route
              path="/admin/*"
              element={
                <Suspense fallback={<DashboardFallback />}>
                  <AdminPortalRoutes />
                </Suspense>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
