import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { User, hashPassword } from "../src/models/User.model";
import { StaffProfile } from "../src/models/StaffProfile.model";
import { ROLES } from "../src/utils/roles";

const app = createApp();

async function createAdmin(email = "admin@school.test", password = "Password123!") {
  const user = await User.create({
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.ADMIN,
    isActive: true,
  });
  await StaffProfile.create({
    userId: user._id,
    employeeId: "EMP-1",
    firstName: "Ada",
    lastName: "Admin",
    designation: "Administrator",
  });
  return user;
}

describe("auth", () => {
  it("GET /api/health responds ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("rejects login with wrong password", async () => {
    await createAdmin();
    const res = await request(app).post("/api/auth/login").send({ email: "admin@school.test", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("logs in, fetches /me with the access token, and sets a refresh cookie", async () => {
    await createAdmin();
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@school.test", password: "Password123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();
    expect(loginRes.body.data.user.role).toBe(ROLES.ADMIN);
    expect(loginRes.headers["set-cookie"]?.[0]).toMatch(/sc_refresh_token=/);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe("admin@school.test");
  });

  it("rejects /me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("refuses to log in a deactivated account", async () => {
    const user = await createAdmin("inactive@school.test");
    user.isActive = false;
    await user.save();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "inactive@school.test", password: "Password123!" });
    expect(res.status).toBe(403);
  });

  it("invalidates old access tokens after password change", async () => {
    await createAdmin("rotate@school.test");
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "rotate@school.test", password: "Password123!" });
    const oldToken = loginRes.body.data.accessToken;

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${oldToken}`)
      .send({ currentPassword: "Password123!", newPassword: "NewPassword456!" });
    expect(changeRes.status).toBe(200);

    const meWithOldToken = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${oldToken}`);
    expect(meWithOldToken.status).toBe(401);
  });
});
