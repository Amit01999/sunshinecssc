import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/context/AuthContext")>("@/context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

function userWith(role: string) {
  return { id: "u1", email: "u@school.test", role, mustChangePassword: false, profile: null };
}

describe("Navbar: public-header dashboard shortcut", () => {
  it("shows the Login entry, not a dashboard shortcut, for an unauthenticated visitor", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderNavbar();

    expect(screen.getAllByText("Login").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("shows the neutral Login entry (not a false logged-out state) while the session is still being restored", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true });
    renderNavbar();

    expect(screen.getAllByText("Login").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("shows a Dashboard shortcut to /admin for an admin, once restoration finishes", () => {
    mockedUseAuth.mockReturnValue({ user: userWith("admin"), isLoading: false });
    renderNavbar();

    const links = screen.getAllByText("Dashboard").map((el) => el.closest("a"));
    expect(links.some((a) => a?.getAttribute("href") === "/admin")).toBe(true);
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("shows a Dashboard shortcut to /admin for super_admin and academic_admin as well", () => {
    for (const role of ["super_admin", "academic_admin"]) {
      mockedUseAuth.mockReturnValue({ user: userWith(role), isLoading: false });
      const { unmount } = renderNavbar();
      const links = screen.getAllByText("Dashboard").map((el) => el.closest("a"));
      expect(links.some((a) => a?.getAttribute("href") === "/admin")).toBe(true);
      unmount();
    }
  });

  it("shows a Dashboard shortcut to /staff-portal for teacher and staff", () => {
    for (const role of ["teacher", "staff"]) {
      mockedUseAuth.mockReturnValue({ user: userWith(role), isLoading: false });
      const { unmount } = renderNavbar();
      const links = screen.getAllByText("Dashboard").map((el) => el.closest("a"));
      expect(links.some((a) => a?.getAttribute("href") === "/staff-portal")).toBe(true);
      unmount();
    }
  });

  it("shows a Dashboard shortcut to /portal for student and parent", () => {
    for (const role of ["student", "parent"]) {
      mockedUseAuth.mockReturnValue({ user: userWith(role), isLoading: false });
      const { unmount } = renderNavbar();
      const links = screen.getAllByText("Dashboard").map((el) => el.closest("a"));
      expect(links.some((a) => a?.getAttribute("href") === "/portal")).toBe(true);
      unmount();
    }
  });

  it("drops the Dashboard shortcut and brings back Login once the user logs out", () => {
    mockedUseAuth.mockReturnValue({ user: userWith("student"), isLoading: false });
    const { rerender } = renderNavbar();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);

    mockedUseAuth.mockReturnValue({ user: null, isLoading: false });
    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getAllByText("Login").length).toBeGreaterThan(0);
  });
});
