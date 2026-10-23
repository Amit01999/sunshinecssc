import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/context/AuthContext")>("@/context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/portal/*"
          element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <div>Portal Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "academic_admin"]}>
              <div>Admin Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login/students" element={<div>Student Login Page</div>} />
        <Route path="/login/teachers" element={<div>Teacher Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        <Route path="/portal/profile" element={<div>Profile Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state and renders nothing else while auth is still resolving", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true });
    renderAt("/portal");
    expect(screen.queryByText("Portal Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Student Login Page")).not.toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to the student/parent login for a /portal route", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt("/portal");
    expect(screen.getByText("Student Login Page")).toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to the teacher login for an /admin route", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt("/admin");
    expect(screen.getByText("Teacher Login Page")).toBeInTheDocument();
  });

  it("blocks a wrong-role user from a route not in allowedRoles, sending them to /unauthorized", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", role: "teacher", mustChangePassword: false, email: "t@school.test", profile: null },
      isLoading: false,
    });
    renderAt("/admin");
    expect(screen.getByText("Unauthorized Page")).toBeInTheDocument();
  });

  it("never lets a student reach the admin dashboard by URL, even though they are authenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", role: "student", mustChangePassword: false, email: "s@school.test", profile: null },
      isLoading: false,
    });
    renderAt("/admin");
    expect(screen.getByText("Unauthorized Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("forces a must-change-password user to the security tab instead of the requested page", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", role: "student", mustChangePassword: true, email: "s@school.test", profile: null },
      isLoading: false,
    });
    renderAt("/portal");
    expect(screen.getByText("Profile Page")).toBeInTheDocument();
  });

  it("renders the protected content for an authorized, fully-set-up user", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", role: "student", mustChangePassword: false, email: "s@school.test", profile: null },
      isLoading: false,
    });
    renderAt("/portal");
    expect(screen.getByText("Portal Content")).toBeInTheDocument();
  });
});
