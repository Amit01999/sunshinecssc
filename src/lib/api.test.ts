import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      })),
      post: vi.fn(),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

import { refreshAccessToken, onAuthFailure, getAccessToken } from "./api";

const mockedPost = axios.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedPost.mockReset();
});

describe("refreshAccessToken", () => {
  it("dedupes concurrent calls into exactly one network request", async () => {
    let resolvePost: (v: unknown) => void;
    mockedPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const p1 = refreshAccessToken();
    const p2 = refreshAccessToken();
    const p3 = refreshAccessToken();

    expect(mockedPost).toHaveBeenCalledTimes(1);
    resolvePost!({ data: { data: { accessToken: "fresh-token" } } });

    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
    expect(t1).toBe("fresh-token");
    expect(t2).toBe("fresh-token");
    expect(t3).toBe("fresh-token");
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("allows a fresh network request on the next call once the previous one settles", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "token-a" } } });
    await refreshAccessToken();
    mockedPost.mockResolvedValueOnce({ data: { data: { accessToken: "token-b" } } });
    await refreshAccessToken();

    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBe("token-b");
  });

  it("notifies onAuthFailure listeners when the server genuinely rejects the refresh", async () => {
    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401, data: {} } });
    const listener = vi.fn();
    const unsubscribe = onAuthFailure(listener);

    const token = await refreshAccessToken();

    expect(token).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does NOT notify onAuthFailure listeners for a transport-only failure (no response)", async () => {
    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: undefined });
    const listener = vi.fn();
    const unsubscribe = onAuthFailure(listener);

    const token = await refreshAccessToken();

    expect(token).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops notifying a listener after it unsubscribes", async () => {
    const listener = vi.fn();
    const unsubscribe = onAuthFailure(listener);
    unsubscribe();

    mockedPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
    await refreshAccessToken();

    expect(listener).not.toHaveBeenCalled();
  });
});
