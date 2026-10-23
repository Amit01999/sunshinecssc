import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import { StaffLayout } from "./StaffLayout";
import Overview from "./pages/Overview";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Classes from "./pages/Classes";
import Assignments from "./pages/Assignments";
import Examinations from "./pages/Examinations";
import StudentLeave from "./pages/StudentLeave";
import Communication from "./pages/Communication";
import Profile from "./pages/Profile";

const ALLOWED = ["teacher", "staff"] as const;

function withLayout(title: string, element: JSX.Element) {
  return (
    <ProtectedRoute allowedRoles={[...ALLOWED]}>
      <StaffLayout title={title}>{element}</StaffLayout>
    </ProtectedRoute>
  );
}

export default function StaffPortalRoutes() {
  return (
    <Routes>
      <Route index element={withLayout("Overview", <Overview />)} />
      <Route path="students" element={withLayout("My Students", <Students />)} />
      <Route path="attendance" element={withLayout("Attendance", <Attendance />)} />
      <Route path="classes" element={withLayout("Classes & Materials", <Classes />)} />
      <Route path="assignments" element={withLayout("Assignments", <Assignments />)} />
      <Route path="examinations" element={withLayout("Examinations", <Examinations />)} />
      <Route path="student-leave" element={withLayout("Student Leave Applications", <StudentLeave />)} />
      <Route path="communication" element={withLayout("Communication", <Communication />)} />
      <Route path="profile" element={withLayout("Profile & Leave", <Profile />)} />
    </Routes>
  );
}
