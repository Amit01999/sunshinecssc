import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("leave applications: student submit -> admin review -> student sees the decision", () => {
  it("runs the full approve path end to end with a real review note round-tripping back to the student", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `leave-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });

    const studentAuth = authed(app, student.token);
    const submitRes = await studentAuth.post("/api/leave-applications").send({
      fromDate: "2030-01-10",
      toDate: "2030-01-12",
      reason: "Family function out of town",
    });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe("pending");
    expect(submitRes.body.data.applicantRole).toBe("student");
    const applicationId = submitRes.body.data._id;

    // It must show up in the student's own list immediately, still pending.
    const mineBefore = await studentAuth.get("/api/leave-applications/mine");
    expect(mineBefore.body.data.map((a: any) => a._id)).toContain(applicationId);
    expect(mineBefore.body.data[0].status).toBe("pending");

    // It must also be visible to admin's review queue, correctly attributed.
    const adminList = await admin.get("/api/leave-applications");
    expect(adminList.status).toBe(200);
    const row = adminList.body.data.find((a: any) => a._id === applicationId);
    expect(row).toBeTruthy();
    expect(row.applicantRole).toBe("student");
    expect(typeof row.applicantId.email).toBe("string");

    const approveRes = await admin.post(`/api/leave-applications/${applicationId}/review`).send({
      status: "approved",
      reviewNote: "Approved, enjoy the trip",
    });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("approved");

    // The student must see the decision and the reviewer's note on their own page.
    const mineAfter = await studentAuth.get("/api/leave-applications/mine");
    const updated = mineAfter.body.data.find((a: any) => a._id === applicationId);
    expect(updated.status).toBe("approved");
    expect(updated.reviewNote).toBe("Approved, enjoy the trip");
    expect(updated.reviewedAt).toBeTruthy();
  });

  it("runs the reject path, and blocks a second review of an already-decided application", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `leave-reject-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });

    const studentAuth = authed(app, student.token);
    const submitRes = await studentAuth.post("/api/leave-applications").send({
      fromDate: "2030-02-01",
      toDate: "2030-02-02",
      reason: "Personal reasons",
    });
    const applicationId = submitRes.body.data._id;

    const rejectRes = await admin.post(`/api/leave-applications/${applicationId}/review`).send({
      status: "rejected",
      reviewNote: "Too close to the term exam",
    });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");

    const mineAfter = await studentAuth.get("/api/leave-applications/mine");
    expect(mineAfter.body.data.find((a: any) => a._id === applicationId).status).toBe("rejected");

    // Cannot be reviewed a second time.
    const secondReview = await admin.post(`/api/leave-applications/${applicationId}/review`).send({ status: "approved" });
    expect(secondReview.status).toBe(409);
  });

  it("never lets a student see another student's leave applications; an unrelated teacher sees the list endpoint succeed but it excludes a student they have no association with, and review stays admin-only", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `leaveA-${unique()}@school.test`, { classId, sectionId, rollNumber: "3", academicYearId });
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `leaveB-${unique()}@school.test`, { classId, sectionId, rollNumber: "4", academicYearId });

    const aRes = await authed(app, studentA.token).post("/api/leave-applications").send({ fromDate: "2030-03-01", toDate: "2030-03-02", reason: "A's reason" });
    const applicationIdA = aRes.body.data._id;

    const bMine = await authed(app, studentB.token).get("/api/leave-applications/mine");
    expect(bMine.body.data.map((a: any) => a._id)).not.toContain(applicationIdA);

    // A teacher with no class-teacher role or teaching assignment for this class/section is not
    // "associated" with studentA - the endpoint succeeds (teachers may call it) but excludes them.
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `leaveteacher-${unique()}@school.test`);
    const teacherListAttempt = await authed(app, teacher.token).get("/api/leave-applications");
    expect(teacherListAttempt.status).toBe(200);
    expect(teacherListAttempt.body.data.map((a: any) => a._id)).not.toContain(applicationIdA);

    const teacherReviewAttempt = await authed(app, teacher.token).post(`/api/leave-applications/${applicationIdA}/review`).send({ status: "approved" });
    expect(teacherReviewAttempt.status).toBe(403);
  });

  it("lets teachers and staff submit their own leave applications too, correctly attributed", async () => {
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `leaveteacher2-${unique()}@school.test`);
    const res = await authed(app, teacher.token).post("/api/leave-applications").send({ fromDate: "2030-04-01", toDate: "2030-04-03", reason: "Conference" });
    expect(res.status).toBe(201);
    expect(res.body.data.applicantRole).toBe("teacher");
  });
});
