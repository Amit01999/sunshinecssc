import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<() => void> }));

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  setAccessToken: vi.fn(),
  onAuthFailure: (cb: () => void) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
  getErrorMessage: (e: unknown) => String(e),
}));

import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "./AuthContext";

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;

function fireAuthFailure() {
  listeners.forEach((l) => l());
}

function student(overrides: Record<string, unknown> = {}) {
  return { id: "u1", email: "student@school.test", role: "student", mustChangePassword: false, profile: null, ...overrides };
}

function parentWith(children: Array<{ _id: string }>) {
  return { id: "u2", email: "parent@school.test", role: "parent", mustChangePassword: false, profile: null, children };
}

function TestConsumer() {
  const { user, isLoading, activeChildId, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="user">{user ? user.email : "none"}</div>
      <div data-testid="activeChildId">{activeChildId ?? "none"}</div>
      <button onClick={() => login("x@y.test", "pw").catch(() => {})}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderAuth() {
  const queryClient = new QueryClient();
  const clearSpy = vi.spyOn(queryClient, "clear");
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { clearSpy };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  listeners.length = 0;
});

describe("AuthProvider: session restoration on mount", () => {
  it("restores a valid session via /auth/refresh + /auth/me", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "tok" } } });
    mockedGet.mockResolvedValueOnce({ data: { data: student() } });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("student@school.test");
  });

  it("a genuine 401 from /auth/refresh leaves the user logged out, with no retry", async () => {
    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401, data: {} } });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("a transient network error is retried once and recovers if the retry succeeds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedPost
      .mockRejectedValueOnce({ isAxiosError: true, response: undefined })
      .mockResolvedValueOnce({ data: { data: { accessToken: "tok" } } });
    mockedGet.mockResolvedValueOnce({ data: { data: student() } });

    renderAuth();
    await vi.advanceTimersByTimeAsync(1000);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("student@school.test");
    expect(mockedPost).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("gives up and logs out after the retry also fails with a transport error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedPost.mockRejectedValue({ isAxiosError: true, response: undefined });

    renderAuth();
    await vi.advanceTimersByTimeAsync(1000);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(mockedPost).toHaveBeenCalledTimes(2); // initial attempt + exactly one bounded retry
    vi.useRealTimers();
  });
});

describe("AuthProvider: login", () => {
  it("clears the query cache and selects the first linked child for a parent", async () => {
    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } }); // initial mount restore
    const { clearSpy } = renderAuth();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    clearSpy.mockClear();

    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "tok", user: parentWith([{ _id: "child-1" }]) } } });
    fireEvent.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("parent@school.test"));
    expect(screen.getByTestId("activeChildId").textContent).toBe("child-1");
    expect(clearSpy).toHaveBeenCalled();
  });

  it("leaves activeChildId null for a parent with no linked children (never inherits a stale selection)", async () => {
    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "tok", user: parentWith([]) } } });
    fireEvent.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("parent@school.test"));
    expect(screen.getByTestId("activeChildId").textContent).toBe("none");
  });
});

describe("AuthProvider: logout", () => {
  it("clears user, activeChildId, and the query cache", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "tok" } } });
    mockedGet.mockResolvedValueOnce({ data: { data: parentWith([{ _id: "child-1" }]) } });
    const { clearSpy } = renderAuth();
    await waitFor(() => expect(screen.getByTestId("activeChildId").textContent).toBe("child-1"));
    clearSpy.mockClear();

    mockedPost.mockResolvedValueOnce({ data: {} }); // /auth/logout
    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"));
    expect(screen.getByTestId("activeChildId").textContent).toBe("none");
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("AuthProvider: background auth-failure sync", () => {
  it("logs the UI out when a background refresh is definitively rejected elsewhere in the app", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "tok" } } });
    mockedGet.mockResolvedValueOnce({ data: { data: student() } });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("student@school.test"));

    fireAuthFailure();

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"));
  });
});
