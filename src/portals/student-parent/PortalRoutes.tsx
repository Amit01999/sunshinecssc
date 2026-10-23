import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import { PortalLayout } from "./PortalLayout";
import Overview from "./pages/Overview";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import Classes from "./pages/Classes";
import Assignments from "./pages/Assignments";
import Results from "./pages/Results";
import ResultDetail from "./pages/ResultDetail";
import Notices from "./pages/Notices";
import Support from "./pages/Support";
import Children from "./pages/Children";
import Fees from "./pages/Fees";

const ALLOWED = ["student", "parent"] as const;

function withLayout(title: string, element: JSX.Element) {
  return (
    <ProtectedRoute allowedRoles={[...ALLOWED]}>
      <PortalLayout title={title}>{element}</PortalLayout>
    </ProtectedRoute>
  );
}

export default function PortalRoutes() {
  return (
    <Routes>
      <Route index element={withLayout("Overview", <Overview />)} />
      <Route path="children" element={withLayout("Linked Children", <Children />)} />
      <Route path="profile" element={withLayout("My Profile", <Profile />)} />
      <Route path="attendance" element={withLayout("Attendance", <Attendance />)} />
      <Route path="classes" element={withLayout("Classes & Materials", <Classes />)} />
      <Route path="assignments" element={withLayout("Assignments", <Assignments />)} />
      <Route path="results" element={withLayout("Results", <Results />)} />
      <Route path="results/:examinationId" element={withLayout("Examination Result", <ResultDetail />)} />
      <Route path="notices" element={withLayout("Notices & Events", <Notices />)} />
      <Route path="fees" element={withLayout("Fees & Payments", <Fees />)} />
      <Route path="support" element={withLayout("Support", <Support />)} />
    </Routes>
  );
}
