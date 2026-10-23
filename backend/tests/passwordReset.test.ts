import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("admin: reset a user's password", () => {
  it("issues a fresh temporary password that logs the user in and forces a change, invalidating the old one", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const email = `pwreset-${unique()}@school.test`;

    const createRes = await admin.post("/api/admin/users").send({ email, role: ROLES.STAFF, firstName: "Pw", lastName: "Reset" });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.data.userId;
    const originalPassword = createRes.body.data.temporaryPassword;

    const resetRes = await admin.post(`/api/admin/users/${userId}/reset-password`);
    expect(resetRes.status).toBe(200);
    const newPassword = resetRes.body.data.temporaryPassword;
    expect(newPassword).toBeTruthy();
    expect(newPassword).not.toBe(originalPassword);

    const oldLogin = await request(app).post("/api/auth/login").send({ email, password: originalPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/auth/login").send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.user.mustChangePassword).toBe(true);
  });
});

describe("teacher: reset a student's password", () => {
  it("lets a teacher re-issue a temp password for a student in their own class/section", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `pwreset-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const studentEmail = `pwreset-student-${unique()}@school.test`;
    const teacherAuth = authed(app, teacher.token);
    const addStudentRes = await teacherAuth.post("/api/teacher/students").send({
      firstName: "Reset",
      lastName: "Target",
      email: studentEmail,
      rollNumber: "11",
      classId,
      sectionId,
    });
    expect(addStudentRes.status).toBe(201);
    const studentProfileId = addStudentRes.body.data.profile._id;
    const originalPassword = addStudentRes.body.data.temporaryPassword;

    const resetRes = await teacherAuth.post(`/api/teacher/students/${studentProfileId}/reset-password`);
    expect(resetRes.status).toBe(200);
    const newPassword = resetRes.body.data.temporaryPassword;
    expect(newPassword).toBeTruthy();
    expect(newPassword).not.toBe(originalPassword);

    const oldLogin = await request(app).post("/api/auth/login").send({ email: studentEmail, password: originalPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/auth/login").send({ email: studentEmail, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.user.mustChangePassword).toBe(true);
  });

  it("blocks a teacher from resetting a student's password outside their assigned class/section", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const owner = await createUserAndLogin(app, ROLES.TEACHER, `pwreset-owner-${unique()}@school.test`);
    const outsider = await createUserAndLogin(app, ROLES.TEACHER, `pwreset-outsider-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: owner.profile._id });

    const ownerAuth = authed(app, owner.token);
    const addStudentRes = await ownerAuth.post("/api/teacher/students").send({
      firstName: "Scoped",
      lastName: "Student",
      email: `pwreset-scoped-${unique()}@school.test`,
      rollNumber: "12",
      classId,
      sectionId,
    });
    const studentProfileId = addStudentRes.body.data.profile._id;

    const outsiderAuth = authed(app, outsider.token);
    const blocked = await outsiderAuth.post(`/api/teacher/students/${studentProfileId}/reset-password`);
    expect(blocked.status).toBe(403);
  });
});
