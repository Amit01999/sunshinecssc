import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, unique } from "./helpers";

const app = createApp();

/** Builds two academic years (each briefly activated, like the real admin workflow), a class +
 *  section + subject in each, and returns everything needed to enroll/mark attendance across
 *  both years for the same student. */
async function seedTwoYears(adminToken: string) {
  const admin = authed(app, adminToken);

  const yearA = await admin.post("/api/academic-years").send({ name: `YrA-${unique()}`, startDate: "2024-01-01", endDate: "2024-12-31" });
  const yearAId = yearA.body.data._id;
  await admin.post(`/api/academic-years/${yearAId}/activate`);
  const classA = await admin.post("/api/classes").send({ name: `ClassA-${unique()}`, academicYearId: yearAId });
  const classAId = classA.body.data._id;
  const sectionA = await admin.post(`/api/classes/${classAId}/sections`).send({ name: "A" });
  const sectionAId = sectionA.body.data._id;
  const subjectA = await admin.post("/api/subjects").send({ name: `SubA-${unique()}`, code: `SA${unique()}` });
  const subjectAId = subjectA.body.data._id;

  const yearB = await admin.post("/api/academic-years").send({ name: `YrB-${unique()}`, startDate: "2025-01-01", endDate: "2025-12-31" });
  const yearBId = yearB.body.data._id;
  await admin.post(`/api/academic-years/${yearBId}/activate`); // becomes the globally "active" year
  const classB = await admin.post("/api/classes").send({ name: `ClassB-${unique()}`, academicYearId: yearBId });
  const classBId = classB.body.data._id;
  const sectionB = await admin.post(`/api/classes/${classBId}/sections`).send({ name: "A" });
  const sectionBId = sectionB.body.data._id;
  const subjectB = await admin.post("/api/subjects").send({ name: `SubB-${unique()}`, code: `SB${unique()}` });
  const subjectBId = subjectB.body.data._id;

  return { yearAId, classAId, sectionAId, subjectAId, yearBId, classBId, sectionBId, subjectBId };
}

async function markOneDay(adminToken: string, teacherToken: string, classId: string, sectionId: string, academicYearId: string, studentId: string, status: string, daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return authed(app, teacherToken)
    .post("/api/attendance")
    .send({ classId, sectionId, academicYearId, date: date.toISOString(), records: [{ studentId, status }] });
}

describe("attendance: academic-year scoping", () => {
  it("defaults a student's summary to their current enrollment year, not the globally active year, when they only have one year of attendance", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, subjectAId } = await seedTwoYears(adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `yr-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId, teacherId: teacher.profile._id });
    // Student is enrolled in year A even though year B is now the globally active one.
    const student = await createUserAndLogin(app, ROLES.STUDENT, `yr-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "1", academicYearId: yearAId });

    await markOneDay(adminToken, teacher.token, classAId, sectionAId, yearAId, student.profile._id, "present");
    await markOneDay(adminToken, teacher.token, classAId, sectionAId, yearAId, student.profile._id, "absent", 1);

    const studentAuth = authed(app, student.token);
    const bareSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(bareSummary.status).toBe(200);
    expect(bareSummary.body.data.total).toBe(2);
    expect(bareSummary.body.data.percentage).toBe(50);
    expect(bareSummary.body.data.academicYearId).toBe(yearAId);

    const dashboard = await studentAuth.get("/api/dashboard/summary");
    expect(dashboard.body.data.attendancePercentage).toBe(50);
    expect(dashboard.body.data.attendanceAcademicYearId).toBe(yearAId);
  });

  it("never mixes two academic years into one default percentage, and keeps both years reachable by explicit selection", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, subjectAId, yearBId, classBId, sectionBId, subjectBId } = await seedTwoYears(adminToken);

    const teacherA = await createUserAndLogin(app, ROLES.TEACHER, `mix-teacher-a-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId, teacherId: teacherA.profile._id });
    const teacherB = await createUserAndLogin(app, ROLES.TEACHER, `mix-teacher-b-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearBId, classId: classBId, sectionId: sectionBId, subjectId: subjectBId, teacherId: teacherB.profile._id });

    // Student is currently enrolled in year B (promoted), but has old year-A attendance too.
    const student = await createUserAndLogin(app, ROLES.STUDENT, `mix-student-${unique()}@school.test`, { classId: classBId, sectionId: sectionBId, rollNumber: "2", academicYearId: yearBId });

    // Attendance is uniquely keyed by (student, calendar date), so year A's and year B's marks
    // must land on non-overlapping dates - exactly like reality, where a transfer splits the
    // calendar into a "before" period and an "after" period rather than ever overlapping.
    // Year A (older dates): 1 present, 1 absent (50%).
    await markOneDay(adminToken, teacherA.token, classAId, sectionAId, yearAId, student.profile._id, "present", 30);
    await markOneDay(adminToken, teacherA.token, classAId, sectionAId, yearAId, student.profile._id, "absent", 31);
    // Year B (recent dates): 3 present, 1 absent (75%).
    await markOneDay(adminToken, teacherB.token, classBId, sectionBId, yearBId, student.profile._id, "present");
    await markOneDay(adminToken, teacherB.token, classBId, sectionBId, yearBId, student.profile._id, "present", 1);
    await markOneDay(adminToken, teacherB.token, classBId, sectionBId, yearBId, student.profile._id, "present", 2);
    await markOneDay(adminToken, teacherB.token, classBId, sectionBId, yearBId, student.profile._id, "absent", 3);

    const studentAuth = authed(app, student.token);

    // Default (no academicYearId) must reflect only the student's CURRENT year (B: 75%), not a blended 62.5%.
    const bareSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(bareSummary.body.data.total).toBe(4);
    expect(bareSummary.body.data.percentage).toBe(75);
    expect(bareSummary.body.data.academicYearId).toBe(yearBId);

    // Explicitly selecting the historical year A must still work and must not include year B's records.
    const yearASummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: yearAId });
    expect(yearASummary.body.data.total).toBe(2);
    expect(yearASummary.body.data.percentage).toBe(50);

    // The "all" escape hatch should see the true combined total (6 records) for completeness.
    const allSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: "all" });
    expect(allSummary.body.data.total).toBe(6);
  });

  it("promotion/transfer: historical attendance stays attached to its original year and is never pulled into the new year's default summary", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, subjectAId, yearBId, classBId, sectionBId, subjectBId } = await seedTwoYears(adminToken);

    const teacherA = await createUserAndLogin(app, ROLES.TEACHER, `promo-teacher-a-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId, teacherId: teacherA.profile._id });

    // Student starts enrolled in year A/class A. Dated in the past so the post-transfer mark
    // below (today) can never collide on the same calendar date - Attendance is uniquely keyed
    // by (student, date), matching the real-world fact that a transfer splits the calendar into
    // a "before" and "after" period rather than ever overlapping.
    const student = await createUserAndLogin(app, ROLES.STUDENT, `promo-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "3", academicYearId: yearAId });
    await markOneDay(adminToken, teacherA.token, classAId, sectionAId, yearAId, student.profile._id, "absent", 30);
    await markOneDay(adminToken, teacherA.token, classAId, sectionAId, yearAId, student.profile._id, "absent", 31);

    // Promote/transfer into year B's class.
    const transferRes = await admin.post(`/api/classes/students/${student.profile._id}/transfer`).send({ classId: classBId, sectionId: sectionBId, rollNumber: "3" });
    expect(transferRes.status).toBe(200);
    expect(String(transferRes.body.data.academicYearId)).toBe(String(yearBId));

    const teacherB = await createUserAndLogin(app, ROLES.TEACHER, `promo-teacher-b-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearBId, classId: classBId, sectionId: sectionBId, subjectId: subjectBId, teacherId: teacherB.profile._id });
    await markOneDay(adminToken, teacherB.token, classBId, sectionBId, yearBId, student.profile._id, "present");

    const studentAuth = authed(app, student.token);

    // After promotion, the default summary must reflect ONLY the new year - the two year-A
    // absences must not drag down the new year's 100% to something lower.
    const bareSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);
    expect(bareSummary.body.data.total).toBe(1);
    expect(bareSummary.body.data.percentage).toBe(100);
    expect(bareSummary.body.data.academicYearId).toBe(yearBId);

    // The old year's 2 absences must still be reachable, unaltered, by explicit selection.
    const oldYearSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: yearAId });
    expect(oldYearSummary.body.data.total).toBe(2);
    expect(oldYearSummary.body.data.percentage).toBe(0);
  });

  it("returns a clean empty state (not 100%) for a year the student was enrolled in but has zero attendance records", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, yearBId, classBId, sectionBId } = await seedTwoYears(adminToken);

    // Enroll the student in year A (so it appears in /years) but never mark attendance there;
    // then transfer to year B where one day IS marked.
    const student = await createUserAndLogin(app, ROLES.STUDENT, `empty-yr-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "4", academicYearId: yearAId });
    await admin.post(`/api/classes/students/${student.profile._id}/transfer`).send({ classId: classBId, sectionId: sectionBId, rollNumber: "4" });

    const studentAuth = authed(app, student.token);
    const emptyYearSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: yearAId });
    expect(emptyYearSummary.status).toBe(200);
    expect(emptyYearSummary.body.data.total).toBe(0);
    expect(emptyYearSummary.body.data.percentage).toBe(0);

    const years = await studentAuth.get(`/api/attendance/student/${student.profile._id}/years`);
    expect(years.status).toBe(200);
    const yearIds = years.body.data.years.map((y: { _id: string }) => y._id);
    expect(yearIds).toContain(yearAId);
    expect(yearIds).toContain(yearBId);
    expect(years.body.data.currentAcademicYearId).toBe(yearBId);
  });

  it("keeps a parent's detail-page figure for a selected year identical to the child's own figure for that same year", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, subjectAId } = await seedTwoYears(adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `parent-yr-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `parent-yr-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "5", academicYearId: yearAId });
    await markOneDay(adminToken, teacher.token, classAId, sectionAId, yearAId, student.profile._id, "present");
    await markOneDay(adminToken, teacher.token, classAId, sectionAId, yearAId, student.profile._id, "late", 1);

    const parent = await createUserAndLogin(app, ROLES.PARENT, `parent-yr-parent-${unique()}@school.test`);
    await admin.post(`/api/admin/users/students/${student.profile._id}/parents`).send({ parentUserId: parent.userId, relationship: "guardian", isPrimary: true });

    const studentAuth = authed(app, student.token);
    const parentAuth = authed(app, parent.token);

    const studentSummary = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: yearAId });
    const parentSummary = await parentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: yearAId });
    expect(parentSummary.status).toBe(200);
    expect(parentSummary.body.data.percentage).toBe(studentSummary.body.data.percentage);
    expect(parentSummary.body.data.total).toBe(studentSummary.body.data.total);
    expect(parentSummary.body.data.percentage).toBe(100); // present + late both count
  });

  it("blocks cross-student access even when a valid academicYearId is supplied", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId } = await seedTwoYears(adminToken);

    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `cross-a-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "6", academicYearId: yearAId });
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `cross-b-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "7", academicYearId: yearAId });

    const studentAAuth = authed(app, studentA.token);
    const blocked = await studentAAuth.get(`/api/attendance/student/${studentB.profile._id}/summary`).query({ academicYearId: yearAId });
    expect(blocked.status).toBe(403);

    const blockedYears = await studentAAuth.get(`/api/attendance/student/${studentB.profile._id}/years`);
    expect(blockedYears.status).toBe(403);
  });

  it("rejects a malformed or nonexistent academicYearId instead of silently ignoring or crashing", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId } = await seedTwoYears(adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `badyear-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "8", academicYearId: yearAId });

    const studentAuth = authed(app, student.token);
    const malformed = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: "not-an-id" });
    expect(malformed.status).toBe(400);

    const wellFormedButMissing = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`).query({ academicYearId: "000000000000000000000000" });
    expect(wellFormedButMissing.status).toBe(400);
  });

  it("keeps the dashboard card and the attendance detail page numerically identical for the default year", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { yearAId, classAId, sectionAId, subjectAId } = await seedTwoYears(adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `consistency-teacher-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `consistency-student-${unique()}@school.test`, { classId: classAId, sectionId: sectionAId, rollNumber: "9", academicYearId: yearAId });

    const statuses = ["present", "present", "present", "absent", "excused"];
    for (let i = 0; i < statuses.length; i++) {
      await markOneDay(adminToken, teacher.token, classAId, sectionAId, yearAId, student.profile._id, statuses[i], i);
    }

    const studentAuth = authed(app, student.token);
    const dashboard = await studentAuth.get("/api/dashboard/summary");
    const detail = await studentAuth.get(`/api/attendance/student/${student.profile._id}/summary`);

    expect(dashboard.body.data.attendancePercentage).toBe(detail.body.data.percentage);
    expect(dashboard.body.data.attendancePercentage).toBe(60); // 3 present / 5 total
  });
});
