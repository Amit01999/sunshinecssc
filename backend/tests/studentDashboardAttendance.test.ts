import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("student dashboard attendance card", () => {
  it("shows 0%, not 100%, when a student has no attendance records at all", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const student = await createUserAndLogin(app, ROLES.STUDENT, `empty-att-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });

    const studentAuth = authed(app, student.token);
    const dashboard = await studentAuth.get("/api/dashboard/summary");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.attendancePercentage).toBe(0);

    const detail = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.percentage).toBe(0);
    expect(detail.body.data.total).toBe(0);
  });

  it("computes the identical percentage on the dashboard card and the attendance detail page for a mix of statuses", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `mix-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `mix-student-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });

    const teacherAuth = authed(app, teacher.token);
    const statuses: Array<"present" | "absent" | "late" | "excused"> = ["present", "present", "absent", "late", "excused"];
    for (let i = 0; i < statuses.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      await teacherAuth.post("/api/attendance").send({
        classId,
        sectionId,
        academicYearId,
        date: date.toISOString(),
        records: [{ studentId: student.profile._id, status: statuses[i] }],
      });
    }

    // (present + late) / total = (2 + 1) / 5 = 60%
    const studentAuth = authed(app, student.token);
    const dashboard = await studentAuth.get("/api/dashboard/summary");
    expect(dashboard.body.data.attendancePercentage).toBe(60);

    const detail = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(detail.body.data.percentage).toBe(60);
    expect(detail.body.data.total).toBe(5);
    expect(detail.body.data.counts).toEqual({ present: 2, absent: 1, late: 1, excused: 1 });

    expect(dashboard.body.data.attendancePercentage).toBe(detail.body.data.percentage);
  });

  it("keeps the parent dashboard's attendance figure for a linked child identical to the child's own figures", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `parent-sync-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `parent-sync-student-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "3",
      academicYearId,
    });

    const teacherAuth = authed(app, teacher.token);
    await teacherAuth.post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: new Date().toISOString(),
      records: [{ studentId: student.profile._id, status: "present" }],
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await teacherAuth.post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: yesterday.toISOString(),
      records: [{ studentId: student.profile._id, status: "absent" }],
    });

    const parent = await createUserAndLogin(app, ROLES.PARENT, `parent-sync-parent-${unique()}@school.test`);
    await admin.post(`/api/admin/users/students/${student.profile._id}/parents`).send({
      parentUserId: parent.userId,
      relationship: "guardian",
      isPrimary: true,
    });

    const studentAuth = authed(app, student.token);
    const studentDashboard = await studentAuth.get("/api/dashboard/summary");
    expect(studentDashboard.body.data.attendancePercentage).toBe(50);

    const parentAuth = authed(app, parent.token);
    const parentDashboard = await parentAuth.get("/api/dashboard/summary");
    // One linked child - the dashboard defaults to them and reports their own numbers directly.
    expect(parentDashboard.body.data.selectedChildId).toBe(student.profile._id);
    expect(parentDashboard.body.data.attendancePercentage).toBe(50);

    const parentDetail = await parentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(parentDetail.status).toBe(200);
    expect(parentDetail.body.data.percentage).toBe(50);

    // An unrelated parent must never see this child's data through either surface.
    const outsiderParent = await createUserAndLogin(app, ROLES.PARENT, `parent-sync-outsider-${unique()}@school.test`);
    const outsiderAuth = authed(app, outsiderParent.token);
    const blocked = await outsiderAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(blocked.status).toBe(403);
  });

  it("never lets a student's own dashboard/attendance endpoints be redirected to another student via a manipulated query param", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `isolation-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `isolation-a-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "4",
      academicYearId,
    });
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `isolation-b-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "5",
      academicYearId,
    });

    const teacherAuth = authed(app, teacher.token);
    await teacherAuth.post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: new Date().toISOString(),
      records: [{ studentId: studentB.profile._id, status: "present" }],
    });

    // Student A has zero records; student B has one "present". A's dashboard must reflect A's own
    // data (0%), never B's, and A must be forbidden from reading B's detail endpoint directly.
    const studentAAuth = authed(app, studentA.token);
    const dashboardA = await studentAAuth.get("/api/dashboard/summary");
    expect(dashboardA.body.data.attendancePercentage).toBe(0);

    const crossRead = await studentAAuth.get(`/api/attendance/student/${studentB.profile._id}/summary`);
    expect(crossRead.status).toBe(403);
  });
});
