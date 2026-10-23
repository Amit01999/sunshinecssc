import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

async function linkChild(admin: ReturnType<typeof authed>, studentId: string, parentUserId: string, relationship = "mother") {
  const res = await admin.post(`/api/admin/users/students/${studentId}/parents`).send({ parentUserId, relationship, isPrimary: true });
  expect(res.status).toBe(201);
}

describe("parent dashboard summary (GET /dashboard/summary for role=parent)", () => {
  it("returns hasChildren:false and an empty child list for a parent with no verified link", async () => {
    const parent = await createUserAndLogin(app, ROLES.PARENT, `nolink-${unique()}@school.test`);
    const res = await authed(app, parent.token).get("/api/dashboard/summary");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hasChildren: false, children: [] });
  });

  it("defaults to the first linked child when no studentId is requested, and matches that child's own dashboard numbers exactly", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const student = await createUserAndLogin(app, ROLES.STUDENT, `pdash-${unique()}@school.test`, { classId, sectionId, rollNumber: "1", academicYearId });
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `pdash-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    await authed(app, teacher.token).post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: new Date().toISOString(),
      records: [{ studentId: student.profile._id, status: "present" }],
    });
    // A still-due, published assignment the student hasn't submitted - must count as "pending" for both views.
    await authed(app, teacher.token).post("/api/assignments").send({
      classId,
      sectionId,
      subjectId,
      academicYearId,
      title: "Homework",
      maxMarks: 10,
      dueDate: "2099-01-01",
    });
    const createdAssignment = await authed(app, teacher.token).get("/api/assignments");
    await authed(app, teacher.token).patch(`/api/assignments/${createdAssignment.body.data[0]._id}`).send({ status: "published" });

    const parent = await createUserAndLogin(app, ROLES.PARENT, `pdash-parent-${unique()}@school.test`);
    await linkChild(admin, student.profile._id, parent.userId);

    const parentRes = await authed(app, parent.token).get("/api/dashboard/summary");
    expect(parentRes.status).toBe(200);
    expect(parentRes.body.data.hasChildren).toBe(true);
    expect(parentRes.body.data.selectedChildId).toBe(student.profile._id);
    expect(parentRes.body.data.children).toHaveLength(1);
    expect(parentRes.body.data.attendancePercentage).toBe(100);

    const studentRes = await authed(app, student.token).get("/api/dashboard/summary");
    // Same child, same underlying data - the two views must report identical numbers.
    expect(parentRes.body.data.attendancePercentage).toBe(studentRes.body.data.attendancePercentage);
    expect(parentRes.body.data.pendingAssignments.length).toBe(studentRes.body.data.pendingAssignments.length);
    expect(parentRes.body.data.pendingAssignments.length).toBe(1);
  });

  it("lets a parent with two children select either one explicitly via ?studentId=, never mixing their data", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const childA = await createUserAndLogin(app, ROLES.STUDENT, `twokids-a-${unique()}@school.test`, { classId, sectionId, rollNumber: "2", academicYearId });
    const childB = await createUserAndLogin(app, ROLES.STUDENT, `twokids-b-${unique()}@school.test`, { classId, sectionId, rollNumber: "3", academicYearId });
    await admin.post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: new Date().toISOString(),
      records: [
        { studentId: childA.profile._id, status: "present" },
        { studentId: childB.profile._id, status: "absent" },
      ],
    });

    const parent = await createUserAndLogin(app, ROLES.PARENT, `twokids-parent-${unique()}@school.test`);
    await linkChild(admin, childA.profile._id, parent.userId, "mother");
    await linkChild(admin, childB.profile._id, parent.userId, "father");

    const parentAuth = authed(app, parent.token);
    const defaultRes = await parentAuth.get("/api/dashboard/summary");
    expect(defaultRes.body.data.selectedChildId).toBe(childA.profile._id);
    expect(defaultRes.body.data.attendancePercentage).toBe(100);
    expect(defaultRes.body.data.children).toHaveLength(2);

    const explicitB = await parentAuth.get(`/api/dashboard/summary?studentId=${childB.profile._id}`);
    expect(explicitB.body.data.selectedChildId).toBe(childB.profile._id);
    expect(explicitB.body.data.attendancePercentage).toBe(0);
  });

  it("blocks a parent from requesting a child that isn't theirs via ?studentId=", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const myChild = await createUserAndLogin(app, ROLES.STUDENT, `guard-mine-${unique()}@school.test`, { classId, sectionId, rollNumber: "4", academicYearId });
    const otherChild = await createUserAndLogin(app, ROLES.STUDENT, `guard-other-${unique()}@school.test`, { classId, sectionId, rollNumber: "5", academicYearId });

    const parent = await createUserAndLogin(app, ROLES.PARENT, `guard-parent-${unique()}@school.test`);
    await linkChild(admin, myChild.profile._id, parent.userId);

    const res = await authed(app, parent.token).get(`/api/dashboard/summary?studentId=${otherChild.profile._id}`);
    expect(res.status).toBe(403);
  });

  it("keeps the dashboard's notices for a parent exactly consistent with /notices/mine", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const otherClass = await admin.post("/api/classes").send({ name: `Other-${unique()}`, academicYearId });

    const child = await createUserAndLogin(app, ROLES.STUDENT, `noticepar-${unique()}@school.test`, { classId, sectionId, rollNumber: "6", academicYearId });
    const parent = await createUserAndLogin(app, ROLES.PARENT, `noticepar-parent-${unique()}@school.test`);
    await linkChild(admin, child.profile._id, parent.userId);

    await admin.post("/api/notices").send({ title: "For Parents", body: "x", audience: "parents", status: "published" });
    await admin.post("/api/notices").send({ title: "Teachers Only", body: "x", audience: "teachers", status: "published" });
    await admin.post("/api/notices").send({ title: "Other Class", body: "x", audience: "class", classId: otherClass.body.data._id, status: "published" });

    const parentAuth = authed(app, parent.token);
    const summary = await parentAuth.get("/api/dashboard/summary");
    const mine = await parentAuth.get("/api/notices/mine");

    const summaryTitles = summary.body.data.notices.map((n: any) => n.title).sort();
    const mineTitles = mine.body.data.map((n: any) => n.title).sort();
    expect(summaryTitles).toEqual(mineTitles);
    expect(summaryTitles).toContain("For Parents");
    expect(summaryTitles).not.toContain("Teachers Only");
    expect(summaryTitles).not.toContain("Other Class");
  });
});
