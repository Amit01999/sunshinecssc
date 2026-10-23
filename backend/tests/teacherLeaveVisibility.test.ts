import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("teacher visibility into student leave applications is scoped to their own students", () => {
  it("shows a student's leave application to their class teacher, but not to an unrelated teacher", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const classTeacher = await createUserAndLogin(app, ROLES.TEACHER, `classteacher-${unique()}@school.test`);
    await admin.patch(`/api/classes/${classId}`).send({ classTeacherId: classTeacher.profile._id });

    const unrelatedTeacher = await createUserAndLogin(app, ROLES.TEACHER, `unrelated-${unique()}@school.test`);

    const student = await createUserAndLogin(app, ROLES.STUDENT, `scopedstudent-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });
    const leaveRes = await authed(app, student.token).post("/api/leave-applications").send({
      fromDate: "2030-05-01",
      toDate: "2030-05-02",
      reason: "Medical appointment",
    });
    expect(leaveRes.status).toBe(201);
    const applicationId = leaveRes.body.data._id;

    const classTeacherList = await authed(app, classTeacher.token).get("/api/leave-applications");
    expect(classTeacherList.status).toBe(200);
    expect(classTeacherList.body.data.map((a: any) => a._id)).toContain(applicationId);

    const unrelatedList = await authed(app, unrelatedTeacher.token).get("/api/leave-applications");
    expect(unrelatedList.status).toBe(200);
    expect(unrelatedList.body.data.map((a: any) => a._id)).not.toContain(applicationId);
  });

  it("also shows the application to a subject teacher assigned to that class+section (not just the class teacher)", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const subjectTeacher = await createUserAndLogin(app, ROLES.TEACHER, `subjteacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: subjectTeacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `assignedstudent-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });
    const leaveRes = await authed(app, student.token).post("/api/leave-applications").send({
      fromDate: "2030-06-01",
      toDate: "2030-06-01",
      reason: "Family event",
    });
    const applicationId = leaveRes.body.data._id;

    const list = await authed(app, subjectTeacher.token).get("/api/leave-applications");
    expect(list.body.data.map((a: any) => a._id)).toContain(applicationId);
  });

  it("never leaks a teacher's own or a different applicant's leave application type into a student list (stays student-only), and keeps review admin-only", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const classTeacher = await createUserAndLogin(app, ROLES.TEACHER, `reviewcheck-${unique()}@school.test`);
    await admin.patch(`/api/classes/${classId}`).send({ classTeacherId: classTeacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `reviewcheckstudent-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "3",
      academicYearId,
    });
    const leaveRes = await authed(app, student.token).post("/api/leave-applications").send({
      fromDate: "2030-07-01",
      toDate: "2030-07-02",
      reason: "Trip",
    });
    const applicationId = leaveRes.body.data._id;

    // A teacher's own leave application must never appear in their "my students" view.
    await authed(app, classTeacher.token).post("/api/leave-applications").send({ fromDate: "2030-07-05", toDate: "2030-07-06", reason: "My own leave" });
    const list = await authed(app, classTeacher.token).get("/api/leave-applications");
    const reasons = list.body.data.map((a: any) => a.reason);
    expect(reasons).toContain("Trip");
    expect(reasons).not.toContain("My own leave");

    // Visibility does not imply decision power - review stays admin-only.
    const reviewAttempt = await authed(app, classTeacher.token).post(`/api/leave-applications/${applicationId}/review`).send({ status: "approved" });
    expect(reviewAttempt.status).toBe(403);
  });

  it("counts only the associated teacher's own students' pending requests on the teacher dashboard summary", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const otherClass = await admin.post("/api/classes").send({ name: `Other-${unique()}`, academicYearId });
    const otherClassId = otherClass.body.data._id;
    const otherSection = await admin.post(`/api/classes/${otherClassId}/sections`).send({ name: "A" });
    const otherSectionId = otherSection.body.data._id;

    const classTeacher = await createUserAndLogin(app, ROLES.TEACHER, `dashcount-${unique()}@school.test`);
    await admin.patch(`/api/classes/${classId}`).send({ classTeacherId: classTeacher.profile._id });

    const myStudent = await createUserAndLogin(app, ROLES.STUDENT, `dashcountstudent-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "4",
      academicYearId,
    });
    const otherStudent = await createUserAndLogin(app, ROLES.STUDENT, `dashcountother-${unique()}@school.test`, {
      classId: otherClassId,
      sectionId: otherSectionId,
      rollNumber: "5",
      academicYearId,
    });

    await authed(app, myStudent.token).post("/api/leave-applications").send({ fromDate: "2030-08-01", toDate: "2030-08-02", reason: "mine" });
    await authed(app, otherStudent.token).post("/api/leave-applications").send({ fromDate: "2030-08-03", toDate: "2030-08-04", reason: "not mine" });

    const summary = await authed(app, classTeacher.token).get("/api/dashboard/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.data.pendingStudentLeaveRequests).toBe(1);
  });

  it("leaves the admin's own unscoped leave-application list unaffected", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `adminscope-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "6",
      academicYearId,
    });
    const leaveRes = await authed(app, student.token).post("/api/leave-applications").send({ fromDate: "2030-09-01", toDate: "2030-09-02", reason: "x" });

    const adminList = await admin.get("/api/leave-applications");
    expect(adminList.body.data.map((a: any) => a._id)).toContain(leaveRes.body.data._id);
  });
});
