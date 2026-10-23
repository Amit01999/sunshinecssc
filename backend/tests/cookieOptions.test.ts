import { describe, it, expect, afterAll, vi } from "vitest";

// refreshCookieOptions() reads env.isProduction, which is fixed at module-import time from
// NODE_ENV - the rest of this suite runs under NODE_ENV=test, so getting a real "production"
// instance of the module requires resetting the module registry and re-importing with
// NODE_ENV temporarily flipped. This is the actual persistence/security config a browser will
// honor in production - a regression here (e.g. losing maxAge, turning this into a session
// cookie) would be invisible in every other test, which only ever runs in test mode.
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

async function loadTokensModuleAs(nodeEnv: "production" | "development") {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/unused";
  process.env.JWT_ACCESS_SECRET ||= "unused-access-secret";
  process.env.JWT_REFRESH_SECRET ||= "unused-refresh-secret";
  try {
    vi.resetModules();
    return await import("../src/utils/tokens");
  } finally {
    process.env.NODE_ENV = previous;
  }
}

describe("refreshCookieOptions: production configuration", () => {
  it("is a persistent cookie (has maxAge), not a session cookie that disappears when the browser closes", async () => {
    const { refreshCookieOptions } = await loadTokensModuleAs("production");
    const options = refreshCookieOptions();

    expect(options.maxAge).toBeDefined();
    expect(options.maxAge).toBeGreaterThan(0);
    // 30 days, expressed in milliseconds (the unit Express's res.cookie expects).
    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("is Secure + SameSite=None - required for the cookie to survive a cross-site XHR/fetch request", async () => {
    const { refreshCookieOptions } = await loadTokensModuleAs("production");
    const options = refreshCookieOptions();

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("is httpOnly and scoped to the auth path only", async () => {
    const { refreshCookieOptions } = await loadTokensModuleAs("production");
    const options = refreshCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/api/auth");
  });

  it("never sets an explicit cookie Domain - it must stay scoped to whichever origin actually issued it", async () => {
    const { refreshCookieOptions } = await loadTokensModuleAs("production");
    const options = refreshCookieOptions() as Record<string, unknown>;

    expect(options.domain).toBeUndefined();
  });
});

describe("refreshCookieOptions: non-production (local dev) configuration", () => {
  it("relaxes Secure/SameSite for plain-HTTP localhost, but keeps the cookie persistent and httpOnly", async () => {
    const { refreshCookieOptions } = await loadTokensModuleAs("development");
    const options = refreshCookieOptions();

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.httpOnly).toBe(true);
    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
