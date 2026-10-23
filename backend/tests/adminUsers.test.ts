import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { User, hashPassword } from "../src/models/User.model";
import { StaffProfile } from "../src/models/StaffProfile.model";
import { ROLES } from "../src/utils/roles";

const app = createApp();

async function loginAs(role: string, email: string) {
  const user = await User.create({ email, passwordHash: await hashPassword("Password123!"), role, isActive: true });
  await StaffProfile.create({ userId: user._id, employeeId: `E-${email}`, firstName: "A", lastName: "B" });
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  return { token: res.body.data.accessToken as string, user };
}

describe("admin user management", () => {
  it("blocks non-admin roles from the admin users API", async () => {
    const { token } = await loginAs(ROLES.TEACHER, "teacher1@school.test");
    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("lets an admin create a student and a parent, then verify-link them", async () => {
    const { token } = await loginAs(ROLES.ADMIN, "admin2@school.test");

    const studentRes = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "student1@school.test", role: ROLES.STUDENT, firstName: "Sam", lastName: "Student" });
    expect(studentRes.status).toBe(201);
    expect(studentRes.body.data.profile.studentCode).toMatch(/^SS-/);

    const parentRes = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "parent1@school.test", role: ROLES.PARENT, firstName: "Pat", lastName: "Parent" });
    expect(parentRes.status).toBe(201);

    const linkRes = await request(app)
      .post(`/api/admin/users/students/${studentRes.body.data.profile._id}/parents`)
      .set("Authorization", `Bearer ${token}`)
      .send({ parentUserId: parentRes.body.data.userId, relationship: "father", isPrimary: true });
    expect(linkRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/admin/users/students/${studentRes.body.data.profile._id}/parents`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it("refuses to demote the last active super admin", async () => {
    const { token, user } = await loginAs(ROLES.SUPER_ADMIN, "super1@school.test");
    const res = await request(app)
      .patch(`/api/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });
    expect(res.status).toBe(403);
  });

  it("rejects creating a duplicate email", async () => {
    const { token } = await loginAs(ROLES.ADMIN, "admin3@school.test");
    await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "dup@school.test", role: ROLES.STAFF, firstName: "X", lastName: "Y" });
    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "dup@school.test", role: ROLES.STAFF, firstName: "X2", lastName: "Y2" });
    expect(res.status).toBe(409);
  });
});
