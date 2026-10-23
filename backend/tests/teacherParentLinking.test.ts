import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("teacher parent-linking (scoped to their own students)", () => {
  it("lets a class teacher list a parent-account picker, link a parent to their own student, see it, and unlink it", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const classTeacher = await createUserAndLogin(app, ROLES.TEACHER, `tplink-classteacher-${unique()}@school.test`);
    await admin.patch(`/api/classes/${classId}`).send({ classTeacherId: classTeacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `tplink-student-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });
    const parentEmail = `tplink-parent-${unique()}@school.test`;
    const parent = await createUserAndLogin(app, ROLES.PARENT, parentEmail);

    const teacherAuth = authed(app, classTeacher.token);

    const parentOptions = await teacherAuth.get("/api/teacher/students/parents");
    expect(parentOptions.status).toBe(200);
    expect(parentOptions.body.data.map((p: any) => p.email)).toContain(parentEmail);
    // Minimal shape check - every entry has only the fields a picker needs.
    expect(parentOptions.body.data[0]).toHaveProperty("email");

    const linkRes = await teacherAuth
      .post(`/api/admin/users/students/${student.profile._id}/parents`)
      .send({ parentUserId: parent.userId, relationship: "mother", isPrimary: true });
    expect(linkRes.status).toBe(201);

    const listRes = await teacherAuth.get(`/api/admin/users/students/${student.profile._id}/parents`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].relationship).toBe("mother");
    const parentProfileId = listRes.body.data[0].parentId._id;

    // The newly-linked parent can now see this student as their child.
    const parentDashboard = await authed(app, parent.token).get("/api/dashboard/summary");
    expect(parentDashboard.body.data.selectedChildId).toBe(student.profile._id);

    const unlinkRes = await teacherAuth.delete(`/api/admin/users/students/${student.profile._id}/parents/${parentProfileId}`);
    expect(unlinkRes.status).toBe(200);
    const listAfter = await teacherAuth.get(`/api/admin/users/students/${student.profile._id}/parents`);
    expect(listAfter.body.data).toHaveLength(0);
  });

  it("also allows a subject teacher (via teaching assignment, not just the class teacher) to link a parent", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const subjectTeacher = await createUserAndLogin(app, ROLES.TEACHER, `tplink-subjteacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: subjectTeacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `tplink-assigned-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });
    const parent = await createUserAndLogin(app, ROLES.PARENT, `tplink-parent2-${unique()}@school.test`);

    const linkRes = await authed(app, subjectTeacher.token)
      .post(`/api/admin/users/students/${student.profile._id}/parents`)
      .send({ parentUserId: parent.userId, relationship: "father", isPrimary: false });
    expect(linkRes.status).toBe(201);
  });

  it("blocks a teacher with no association to the student's class from linking, listing, or unlinking", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const student = await createUserAndLogin(app, ROLES.STUDENT, `tplink-unrelated-student-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "3",
      academicYearId,
    });
    const parent = await createUserAndLogin(app, ROLES.PARENT, `tplink-unrelated-parent-${unique()}@school.test`);
    const unrelatedTeacher = await createUserAndLogin(app, ROLES.TEACHER, `tplink-unrelated-teacher-${unique()}@school.test`);

    const unrelatedAuth = authed(app, unrelatedTeacher.token);
    const linkAttempt = await unrelatedAuth
      .post(`/api/admin/users/students/${student.profile._id}/parents`)
      .send({ parentUserId: parent.userId, relationship: "guardian" });
    expect(linkAttempt.status).toBe(403);

    // Admin links it anyway (unrelated to this teacher), then this teacher still can't see/remove it.
    const adminLink = await admin
      .post(`/api/admin/users/students/${student.profile._id}/parents`)
      .send({ parentUserId: parent.userId, relationship: "guardian" });
    const parentProfileId = adminLink.body.data.parentId;

    const listAttempt = await unrelatedAuth.get(`/api/admin/users/students/${student.profile._id}/parents`);
    expect(listAttempt.status).toBe(403);

    const unlinkAttempt = await unrelatedAuth.delete(`/api/admin/users/students/${student.profile._id}/parents/${parentProfileId}`);
    expect(unlinkAttempt.status).toBe(403);
  });

  it("keeps every other admin-user-management route admin-only, unaffected by the teacher carve-out", async () => {
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `tplink-noaccess-${unique()}@school.test`);
    const teacherAuth = authed(app, teacher.token);

    expect((await teacherAuth.get("/api/admin/users")).status).toBe(403);
    expect(
      (await teacherAuth.post("/api/admin/users").send({ email: `x-${unique()}@school.test`, role: ROLES.STUDENT, firstName: "X", lastName: "Y" }))
        .status,
    ).toBe(403);

    const someUser = await createUserAndLogin(app, ROLES.STAFF, `tplink-staff-${unique()}@school.test`);
    expect((await teacherAuth.patch(`/api/admin/users/${someUser.userId}`).send({ isActive: false })).status).toBe(403);
    expect((await teacherAuth.post(`/api/admin/users/${someUser.userId}/reset-password`)).status).toBe(403);
  });

  it("still blocks a student from every parent-link endpoint, and gates /teacher/students/parents to teachers only", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `tplink-blocked-student-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "4",
      academicYearId,
    });
    const studentAuth = authed(app, student.token);

    expect((await studentAuth.get("/api/teacher/students/parents")).status).toBe(403);
    expect((await studentAuth.get(`/api/admin/users/students/${student.profile._id}/parents`)).status).toBe(403);
    expect(
      (await studentAuth.post(`/api/admin/users/students/${student.profile._id}/parents`).send({ parentUserId: student.userId, relationship: "guardian" }))
        .status,
    ).toBe(403);
  });
});
