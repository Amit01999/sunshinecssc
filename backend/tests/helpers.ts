import request from "supertest";
import { Express } from "express";
import { User, hashPassword } from "../src/models/User.model";
import { StaffProfile } from "../src/models/StaffProfile.model";
import { ROLES, Role } from "../src/utils/roles";

// Date.now() alone can collide when tests fire many requests within the same millisecond;
// a monotonic counter guarantees every generated id/email in this file is unique.
let uniqueCounter = 0;
export function unique(): string {
  uniqueCounter += 1;
  return `${Date.now()}-${uniqueCounter}`;
}

export async function loginAsAdmin(app: Express, email = `admin-${unique()}@school.test`) {
  const user = await User.create({ email, passwordHash: await hashPassword("Password123!"), role: ROLES.ADMIN, isActive: true });
  await StaffProfile.create({ userId: user._id, employeeId: `E-${user._id}`, firstName: "Admin", lastName: "User" });
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  return res.body.data.accessToken as string;
}

export function authed(app: Express, token: string) {
  return {
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set("Authorization", `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  };
}

export async function createUserAndLogin(app: Express, role: Role, email: string, extra: Record<string, unknown> = {}) {
  const adminToken = await loginAsAdmin(app);
  const res = await authed(app, adminToken).post("/api/admin/users").send({ email, role, firstName: "F", lastName: "L", ...extra });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: res.body.data.temporaryPassword });
  return { token: loginRes.body.data.accessToken as string, profile: res.body.data.profile, userId: res.body.data.userId };
}

/** Creates an active academic year, a department, a class with one section, and returns their ids. */
export async function seedAcademicStructure(app: Express, adminToken: string) {
  const auth = authed(app, adminToken);
  const year = await auth.post("/api/academic-years").send({ name: `Y-${unique()}`, startDate: "2025-01-01", endDate: "2025-12-31" });
  const academicYearId = year.body.data._id;
  await auth.post(`/api/academic-years/${academicYearId}/activate`);

  const klass = await auth.post("/api/classes").send({ name: `Class-${unique()}`, academicYearId });
  const classId = klass.body.data._id;
  const section = await auth.post(`/api/classes/${classId}/sections`).send({ name: "A" });
  const sectionId = section.body.data._id;

  const subject = await auth.post("/api/subjects").send({ name: `Subject-${unique()}`, code: `SUB${unique()}` });
  const subjectId = subject.body.data._id;

  return { academicYearId, classId, sectionId, subjectId };
}
