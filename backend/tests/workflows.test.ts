import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("attendance workflow", () => {
  it("lets an assigned teacher mark attendance, computes a summary, and blocks a parent from viewing another family's child", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `t-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId: teacher.profile._id,
    });

    const studentCreate = await admin.post("/api/admin/users").send({
      email: `s-${Date.now()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "S",
      lastName: "One",
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });
    const studentId = studentCreate.body.data.profile._id;

    const teacherAuth = authed(app, teacher.token);
    const markRes = await teacherAuth.post("/api/attendance").send({
      classId,
      sectionId,
      academicYearId,
      date: new Date().toISOString(),
      records: [{ studentId, status: "present" }],
    });
    expect(markRes.status).toBe(201);

    const summaryRes = await teacherAuth.get(`/api/attendance/student/${studentId}/summary`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.percentage).toBe(100);

    // An outside parent (no verified link to this student) must not see their attendance.
    const outsideParent = await createUserAndLogin(app, ROLES.PARENT, `p-${Date.now()}@school.test`);
    const parentAuth = authed(app, outsideParent.token);
    const blockedRes = await parentAuth.get(`/api/attendance/student/${studentId}/summary`);
    expect(blockedRes.status).toBe(403);
  });
});

describe("admin attendance summary", () => {
  it("aggregates enrollment and attendance by class/section and by date, correctly scoped and excluding unrecorded students from the rate", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId: sectionAId } = await seedAcademicStructure(app, adminToken);
    const sectionB = await admin.post(`/api/classes/${classId}/sections`).send({ name: "B" });
    const sectionBId = sectionB.body.data._id;

    const mkStudent = async (sectionId: string, rollNumber: string) => {
      const res = await admin.post("/api/admin/users").send({
        email: `summary-${unique()}@school.test`,
        role: ROLES.STUDENT,
        firstName: "Sum",
        lastName: rollNumber,
        classId,
        sectionId,
        rollNumber,
        academicYearId,
      });
      return res.body.data.profile._id;
    };
    const s1 = await mkStudent(sectionAId, "1");
    const s2 = await mkStudent(sectionAId, "2");
    const s3 = await mkStudent(sectionBId, "3");

    const today = new Date().toISOString();
    const mark = async (sectionId: string, records: { studentId: string; status: string }[]) =>
      admin.post("/api/attendance").send({ classId, sectionId, academicYearId, date: today, records });

    expect((await mark(sectionAId, [{ studentId: s1, status: "present" }, { studentId: s2, status: "absent" }])).status).toBe(201);
    expect((await mark(sectionBId, [{ studentId: s3, status: "late" }])).status).toBe(201);

    // markAttendance anchors the stored date to *local* midnight, not UTC - build the query string
    // the same way (local Y/M/D), the way a real date picker would, not via toISOString().slice().
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const summary = await admin.get(
      `/api/attendance/admin-summary?academicYearId=${academicYearId}&from=${dateStr}&to=${dateStr}`,
    );
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalEnrolled).toBe(3);
    expect(summary.body.data.counts).toEqual({ present: 1, absent: 1, late: 1, excused: 0 });
    expect(summary.body.data.attendanceRate).toBe(66.7); // (present+late)/totalRecorded, unrecorded students never counted

    const rowA = summary.body.data.byClassSection.find((r: any) => r.sectionId === sectionAId);
    const rowB = summary.body.data.byClassSection.find((r: any) => r.sectionId === sectionBId);
    expect(rowA).toMatchObject({ enrolled: 2, present: 1, absent: 1, late: 0, excused: 0 });
    expect(rowB).toMatchObject({ enrolled: 1, present: 0, absent: 0, late: 1, excused: 0 });

    const dayRow = summary.body.data.byDate.find((d: any) => d.date === dateStr);
    expect(dayRow).toMatchObject({ present: 1, absent: 1, late: 1, excused: 0 });

    // Scoping to a single section only reflects that section.
    const scoped = await admin.get(
      `/api/attendance/admin-summary?academicYearId=${academicYearId}&classId=${classId}&sectionId=${sectionBId}&from=${dateStr}&to=${dateStr}`,
    );
    expect(scoped.body.data.totalEnrolled).toBe(1);
    expect(scoped.body.data.counts).toEqual({ present: 0, absent: 0, late: 1, excused: 0 });
    expect(scoped.body.data.attendanceRate).toBe(100);

    // Missing required params is rejected cleanly.
    const missingParams = await admin.get(`/api/attendance/admin-summary?academicYearId=${academicYearId}`);
    expect(missingParams.status).toBe(400);

    // A teacher (non-admin) must not reach this endpoint.
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `teachsum-${unique()}@school.test`);
    const teacherSummary = await authed(app, teacher.token).get(
      `/api/attendance/admin-summary?academicYearId=${academicYearId}&from=${dateStr}&to=${dateStr}`,
    );
    expect(teacherSummary.status).toBe(403);
  });

  it("enriches admin attendance list records with student name/roll, class/section name, and recorder email", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await admin.post("/api/admin/users").send({
      email: `enrich-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Enrich",
      lastName: "Me",
      classId,
      sectionId,
      rollNumber: "9",
      academicYearId,
    });
    const studentId = student.body.data.profile._id;
    const today = new Date().toISOString();
    await admin.post("/api/attendance").send({ classId, sectionId, academicYearId, date: today, records: [{ studentId, status: "present" }] });

    const list = await admin.get(`/api/attendance?classId=${classId}&sectionId=${sectionId}`);
    expect(list.status).toBe(200);
    const record = list.body.data[0];
    expect(record.studentId).toMatchObject({ firstName: "Enrich", lastName: "Me", rollNumber: "9" });
    expect(record.classId).toMatchObject({ name: expect.any(String) });
    expect(record.sectionId).toMatchObject({ name: "A" });
    expect(typeof record.markedBy.email).toBe("string");

    // A bare "YYYY-MM-DD" from/to (as an HTML date input sends) must still match today's record -
    // regression test for a timezone bug where it was parsed as UTC midnight instead of local.
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const byBareDate = await admin.get(`/api/attendance?classId=${classId}&sectionId=${sectionId}&from=${dateStr}&to=${dateStr}`);
    expect(byBareDate.status).toBe(200);
    expect(byBareDate.body.data).toHaveLength(1);
  });
});

describe("assignment workflow", () => {
  it("runs create -> submit -> grade end to end and rejects over-max marks", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `at-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `as-${Date.now()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "9",
      academicYearId,
    });

    const teacherAuth = authed(app, teacher.token);
    const createRes = await teacherAuth
      .post("/api/assignments")
      .send({ classId, sectionId, subjectId, academicYearId, title: "Homework 1", maxMarks: 10, dueDate: "2099-01-01" });
    expect(createRes.status).toBe(201);
    const assignmentId = createRes.body.data._id;

    await teacherAuth.patch(`/api/assignments/${assignmentId}`).send({ status: "published" });

    const studentAuth = authed(app, student.token);
    const submitRes = await studentAuth.post(`/api/assignments/${assignmentId}/submit`).send({ textAnswer: "My answer" });
    expect(submitRes.status).toBe(201);
    const submissionId = submitRes.body.data._id;

    const overMaxRes = await teacherAuth.post(`/api/assignments/submissions/${submissionId}/grade`).send({ marksObtained: 99 });
    expect(overMaxRes.status).toBe(400);

    const gradeRes = await teacherAuth.post(`/api/assignments/submissions/${submissionId}/grade`).send({ marksObtained: 8, feedback: "Good job" });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.status).toBe("graded");

    const listRes = await studentAuth.get("/api/assignments");
    expect(listRes.body.data[0].submission.marksObtained).toBe(8);
  });
});

describe("exam result approval workflow", () => {
  it("hides unpublished results from students and only allows publishing approved results", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `et-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `es-${Date.now()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "3",
      academicYearId,
    });

    const examRes = await admin.post("/api/examinations").send({
      name: "Midterm",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    expect(examRes.status).toBe(201);
    const examinationId = examRes.body.data._id;

    const teacherAuth = authed(app, teacher.token);
    const enterRes = await teacherAuth
      .post(`/api/examinations/${examinationId}/marks`)
      .send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 88 }] });
    expect(enterRes.status).toBe(201);
    const resultId = enterRes.body.data[0]._id;

    const studentAuth = authed(app, student.token);
    let studentResults = await studentAuth.get(`/api/examinations/results/all?examinationId=${examinationId}`);
    expect(studentResults.body.data).toHaveLength(0); // draft, not visible yet

    // Cannot publish before approval.
    const earlyPublish = await admin.post("/api/examinations/results/publish").send({ resultIds: [resultId] });
    expect(earlyPublish.status).toBe(400);

    await teacherAuth.post("/api/examinations/results/submit").send({ resultIds: [resultId] });
    await admin.post("/api/examinations/results/approve").send({ resultIds: [resultId] });
    const publishRes = await admin.post("/api/examinations/results/publish").send({ resultIds: [resultId] });
    expect(publishRes.status).toBe(200);

    studentResults = await studentAuth.get(`/api/examinations/results/all?examinationId=${examinationId}`);
    expect(studentResults.body.data).toHaveLength(1);
    expect(studentResults.body.data[0].marksObtained).toBe(88);
    expect(studentResults.body.data[0].grade).toBe("A+");
  });

  it("lets a teacher publish their own entered marks directly, skipping submit/approve entirely", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `direct-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `direct-student-${Date.now()}@school.test`, { classId, sectionId, rollNumber: "5", academicYearId });

    const examRes = await admin.post("/api/examinations").send({
      name: "Direct Publish Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const examinationId = examRes.body.data._id;

    const teacherAuth = authed(app, teacher.token);
    const enterRes = await teacherAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 72 }] });
    const resultId = enterRes.body.data[0]._id;

    // Straight from draft to published - no submit, no admin approve.
    const directPublish = await teacherAuth.post("/api/examinations/results/publish").send({ resultIds: [resultId] });
    expect(directPublish.status).toBe(200);

    const studentAuth = authed(app, student.token);
    const studentResults = await studentAuth.get(`/api/examinations/results/all?examinationId=${examinationId}`);
    expect(studentResults.body.data).toHaveLength(1);
    expect(studentResults.body.data[0].marksObtained).toBe(72);
  });

  it("blocks a teacher from publishing another teacher's entered result", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacherA = await createUserAndLogin(app, ROLES.TEACHER, `owner-${Date.now()}@school.test`);
    const teacherB = await createUserAndLogin(app, ROLES.TEACHER, `intruder-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacherA.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `owner-student-${Date.now()}@school.test`, { classId, sectionId, rollNumber: "6", academicYearId });

    const examRes = await admin.post("/api/examinations").send({
      name: "Ownership Test Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const examinationId = examRes.body.data._id;

    const teacherAAuth = authed(app, teacherA.token);
    const enterRes = await teacherAAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 60 }] });
    const resultId = enterRes.body.data[0]._id;

    const teacherBAuth = authed(app, teacherB.token);
    const blockedPublish = await teacherBAuth.post("/api/examinations/results/publish").send({ resultIds: [resultId] });
    expect(blockedPublish.status).toBe(403);
  });

  it("scopes results by subject so a teacher with two subjects for the same exam never sees or submits the other subject's drafts", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId: subjectAId } = await seedAcademicStructure(app, adminToken);
    const subjectBRes = await admin.post("/api/subjects").send({ name: `Subject-B-${Date.now()}`, code: `SUBB${Date.now()}` });
    const subjectBId = subjectBRes.body.data._id;

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `multisub-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId: subjectAId, teacherId: teacher.profile._id });
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId: subjectBId, teacherId: teacher.profile._id });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `multisub-student-${Date.now()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "9",
      academicYearId,
    });

    const examRes = await admin.post("/api/examinations").send({
      name: "Two Subject Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [
        { subjectId: subjectAId, maxMarks: 100, passMarks: 33 },
        { subjectId: subjectBId, maxMarks: 100, passMarks: 33 },
      ],
    });
    const examinationId = examRes.body.data._id;

    const teacherAuth = authed(app, teacher.token);
    await teacherAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId: subjectAId, marks: [{ studentId: student.profile._id, marksObtained: 70 }] });
    await teacherAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId: subjectBId, marks: [{ studentId: student.profile._id, marksObtained: 40 }] });

    const subjectAResults = await teacherAuth.get(`/api/examinations/results/all?examinationId=${examinationId}&subjectId=${subjectAId}`);
    expect(subjectAResults.body.data).toHaveLength(1);
    expect(subjectAResults.body.data[0].marksObtained).toBe(70);

    const subjectBResults = await teacherAuth.get(`/api/examinations/results/all?examinationId=${examinationId}&subjectId=${subjectBId}`);
    expect(subjectBResults.body.data).toHaveLength(1);
    expect(subjectBResults.body.data[0].marksObtained).toBe(40);

    // Submitting only subject A's drafts must never touch subject B's.
    await teacherAuth.post("/api/examinations/results/submit").send({ resultIds: [subjectAResults.body.data[0]._id] });
    const subjectBAfter = await teacherAuth.get(`/api/examinations/results/all?examinationId=${examinationId}&subjectId=${subjectBId}`);
    expect(subjectBAfter.body.data[0].status).toBe("draft");
  });

  it("requires nothing extra to store a rejection reason, which the teacher can then read back", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `reject-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const student = await createUserAndLogin(app, ROLES.STUDENT, `reject-student-${Date.now()}@school.test`, { classId, sectionId, rollNumber: "4", academicYearId });

    const examRes = await admin.post("/api/examinations").send({
      name: "Rejection Test",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const examinationId = examRes.body.data._id;

    const teacherAuth = authed(app, teacher.token);
    const enterRes = await teacherAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 15 }] });
    const resultId = enterRes.body.data[0]._id;
    await teacherAuth.post("/api/examinations/results/submit").send({ resultIds: [resultId] });

    const rejectRes = await admin.post("/api/examinations/results/reject").send({ resultIds: [resultId], reason: "Marks look too low — please double check the answer sheet" });
    expect(rejectRes.status).toBe(200);

    const afterReject = await teacherAuth.get(`/api/examinations/results/all?examinationId=${examinationId}&subjectId=${subjectId}`);
    expect(afterReject.body.data[0].status).toBe("rejected");
    expect(afterReject.body.data[0].rejectedReason).toBe("Marks look too low — please double check the answer sheet");
    expect(afterReject.body.data[0].examinationId.name).toBe("Rejection Test");
  });
});

describe("admin: cross-class/year results browser", () => {
  it("filters published results by academic year and by class, resolving through the exam since results don't store either directly", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const yearA = await admin.post("/api/academic-years").send({ name: `ResA-${unique()}`, startDate: "2025-01-01", endDate: "2025-12-31" });
    const yearAId = yearA.body.data._id;
    await admin.post(`/api/academic-years/${yearAId}/activate`);
    const classA = await admin.post("/api/classes").send({ name: `ResClassA-${unique()}`, academicYearId: yearAId });
    const classAId = classA.body.data._id;
    const sectionA = await admin.post(`/api/classes/${classAId}/sections`).send({ name: "A" });
    const sectionAId = sectionA.body.data._id;
    const subjectA = await admin.post("/api/subjects").send({ name: `ResSubjectA-${unique()}`, code: `RSA${unique()}` });
    const subjectAId = subjectA.body.data._id;
    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `res-student-a-${unique()}@school.test`, {
      classId: classAId,
      sectionId: sectionAId,
      rollNumber: "1",
      academicYearId: yearAId,
    });

    const yearB = await admin.post("/api/academic-years").send({ name: `ResB-${unique()}`, startDate: "2026-01-01", endDate: "2026-12-31" });
    const yearBId = yearB.body.data._id;
    await admin.post(`/api/academic-years/${yearBId}/activate`);
    const classB = await admin.post("/api/classes").send({ name: `ResClassB-${unique()}`, academicYearId: yearBId });
    const classBId = classB.body.data._id;
    const sectionB = await admin.post(`/api/classes/${classBId}/sections`).send({ name: "A" });
    const sectionBId = sectionB.body.data._id;
    const subjectB = await admin.post("/api/subjects").send({ name: `ResSubjectB-${unique()}`, code: `RSB${unique()}` });
    const subjectBId = subjectB.body.data._id;
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `res-student-b-${unique()}@school.test`, {
      classId: classBId,
      sectionId: sectionBId,
      rollNumber: "1",
      academicYearId: yearBId,
    });

    const examA = await admin.post("/api/examinations").send({
      name: "Res Exam A",
      examType: "midterm",
      academicYearId: yearAId,
      classId: classAId,
      subjects: [{ subjectId: subjectAId, maxMarks: 100, passMarks: 33 }],
    });
    const examAId = examA.body.data._id;
    const enterA = await admin.post(`/api/examinations/${examAId}/marks`).send({ subjectId: subjectAId, marks: [{ studentId: studentA.profile._id, marksObtained: 80 }] });
    await admin.post("/api/examinations/results/publish").send({ resultIds: [enterA.body.data[0]._id] });

    const examB = await admin.post("/api/examinations").send({
      name: "Res Exam B",
      examType: "midterm",
      academicYearId: yearBId,
      classId: classBId,
      subjects: [{ subjectId: subjectBId, maxMarks: 100, passMarks: 33 }],
    });
    const examBId = examB.body.data._id;
    const enterB = await admin.post(`/api/examinations/${examBId}/marks`).send({ subjectId: subjectBId, marks: [{ studentId: studentB.profile._id, marksObtained: 60 }] });
    await admin.post("/api/examinations/results/publish").send({ resultIds: [enterB.body.data[0]._id] });

    const byYearA = await admin.get("/api/examinations/results/all").query({ academicYearId: yearAId });
    const yearANames = byYearA.body.data.map((r: { examinationId: { name: string } }) => r.examinationId.name);
    expect(yearANames).toContain("Res Exam A");
    expect(yearANames).not.toContain("Res Exam B");

    const byClassB = await admin.get("/api/examinations/results/all").query({ classId: classBId });
    const classBNames = byClassB.body.data.map((r: { examinationId: { name: string } }) => r.examinationId.name);
    expect(classBNames).toContain("Res Exam B");
    expect(classBNames).not.toContain("Res Exam A");
    expect(byClassB.body.data[0].examinationId.classId.name).toBe(classB.body.data.name);
    expect(byClassB.body.data[0].examinationId.academicYearId.name).toBe(yearB.body.data.name);
  });
});

describe("teacher dashboard summary", () => {
  it("scopes upcoming examinations to classes the teacher actually teaches, and counts their rejected results", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId: myClassId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const otherClassRes = await admin.post("/api/classes").send({ name: `Other-${unique()}`, academicYearId });
    const otherClassId = otherClassRes.body.data._id;

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `dash-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId: myClassId, sectionId, subjectId, teacherId: teacher.profile._id });

    await admin.post("/api/examinations").send({
      name: "My Class Exam",
      examType: "midterm",
      academicYearId,
      classId: myClassId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    await admin.post("/api/examinations").send({
      name: "Other Class Exam",
      examType: "midterm",
      academicYearId,
      classId: otherClassId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });

    const student = await createUserAndLogin(app, ROLES.STUDENT, `dash-student-${Date.now()}@school.test`, { classId: myClassId, sectionId, rollNumber: "7", academicYearId });
    const teacherAuth = authed(app, teacher.token);
    const examRes = await admin.get("/api/examinations").query({ classId: myClassId });
    const examinationId = examRes.body.data[0]._id;
    const enterRes = await teacherAuth.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 10 }] });
    const resultId = enterRes.body.data[0]._id;
    await teacherAuth.post("/api/examinations/results/submit").send({ resultIds: [resultId] });
    await admin.post("/api/examinations/results/reject").send({ resultIds: [resultId], reason: "Too low" });

    const summary = await teacherAuth.get("/api/dashboard/summary");
    expect(summary.status).toBe(200);
    const examNames = summary.body.data.upcomingExaminations.map((e: { name: string }) => e.name);
    expect(examNames).toContain("My Class Exam");
    expect(examNames).not.toContain("Other Class Exam");
    expect(summary.body.data.rejectedResults).toBe(1);
  });
});

describe("parent scoping on list endpoints", () => {
  it("never lets a parent list assignments/materials/timetable without a verified child link, even with no query params", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `pt-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const teacherAuth = authed(app, teacher.token);
    const createRes = await teacherAuth
      .post("/api/assignments")
      .send({ classId, sectionId, subjectId, academicYearId, title: "Scoped HW", maxMarks: 10, dueDate: "2099-01-01" });
    await teacherAuth.patch(`/api/assignments/${createRes.body.data._id}`).send({ status: "published" });

    const myChild = await admin.post("/api/admin/users").send({
      email: `mychild-${Date.now()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "My",
      lastName: "Child",
      classId,
      sectionId,
      rollNumber: "11",
      academicYearId,
    });

    const parent = await createUserAndLogin(app, ROLES.PARENT, `scopedparent-${Date.now()}@school.test`);
    const parentAuth = authed(app, parent.token);

    // No verified link yet: a bare, unscoped request must return nothing, not the whole school's assignments.
    const unlinkedRes = await parentAuth.get("/api/assignments");
    expect(unlinkedRes.status).toBe(200);
    expect(unlinkedRes.body.data).toHaveLength(0);

    await admin
      .post(`/api/admin/users/students/${myChild.body.data.profile._id}/parents`)
      .send({ parentUserId: parent.userId, relationship: "mother", isPrimary: true });

    const linkedRes = await parentAuth.get("/api/assignments");
    expect(linkedRes.status).toBe(200);
    expect(linkedRes.body.data).toHaveLength(1);
    expect(linkedRes.body.data[0].title).toBe("Scoped HW");

    // Asking for a studentId that isn't theirs must be rejected outright.
    const otherChild = await admin.post("/api/admin/users").send({
      email: `other-${Date.now()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Other",
      lastName: "Child",
      classId,
      sectionId,
      rollNumber: "12",
      academicYearId,
    });
    const forbiddenRes = await parentAuth.get(`/api/assignments?studentId=${otherChild.body.data.profile._id}`);
    expect(forbiddenRes.status).toBe(403);
  });
});

describe("teacher self-service student creation", () => {
  it("lets a teacher add a student only to a class/section they are assigned to", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `tcs-${Date.now()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });
    const teacherAuth = authed(app, teacher.token);

    const addRes = await teacherAuth.post("/api/teacher/students").send({
      email: `byteacher-${Date.now()}@school.test`,
      firstName: "Added",
      lastName: "ByTeacher",
      classId,
      sectionId,
      rollNumber: "21",
    });
    expect(addRes.status).toBe(201);
    expect(addRes.body.data.profile.classId).toBe(classId);
    expect(addRes.body.data.profile.rollNumber).toBe("21");
    expect(addRes.body.data.temporaryPassword).toBeTruthy();

    const rosterRes = await teacherAuth.get(`/api/classes/${classId}/roster?sectionId=${sectionId}`);
    expect(rosterRes.body.data.some((s: any) => s.rollNumber === "21")).toBe(true);

    // A second class/section this teacher has no assignment in must be rejected.
    const otherClass = await admin.post("/api/classes").send({ name: `Other-${Date.now()}`, academicYearId });
    const otherSection = await admin.post(`/api/classes/${otherClass.body.data._id}/sections`).send({ name: "A" });
    const deniedRes = await teacherAuth.post("/api/teacher/students").send({
      email: `denied-${Date.now()}@school.test`,
      firstName: "Should",
      lastName: "BeDenied",
      classId: otherClass.body.data._id,
      sectionId: otherSection.body.data._id,
      rollNumber: "1",
    });
    expect(deniedRes.status).toBe(403);

    // Non-teacher roles (e.g. staff) must not reach this endpoint at all.
    const staff = await createUserAndLogin(app, ROLES.STAFF, `staffcs-${Date.now()}@school.test`);
    const staffDenied = await authed(app, staff.token).post("/api/teacher/students").send({
      email: `staffdenied-${Date.now()}@school.test`,
      firstName: "Staff",
      lastName: "Denied",
      classId,
      sectionId,
      rollNumber: "22",
    });
    expect(staffDenied.status).toBe(403);
  });
});

describe("enrollment and transfer data integrity", () => {
  it("rejects a duplicate active roll number within the same class/section/year", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const first = await admin.post("/api/admin/users").send({
      email: `rollA-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "First",
      lastName: "Student",
      classId,
      sectionId,
      academicYearId,
      rollNumber: "7",
    });
    expect(first.status).toBe(201);

    const duplicate = await admin.post("/api/admin/users").send({
      email: `rollB-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Second",
      lastName: "Student",
      classId,
      sectionId,
      academicYearId,
      rollNumber: "7",
    });
    expect(duplicate.status).toBe(409);
  });

  it("rejects a transfer into a section that does not belong to the target class", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const otherClass = await admin.post("/api/classes").send({ name: `Mismatch-${unique()}`, academicYearId });
    const otherSection = await admin.post(`/api/classes/${otherClass.body.data._id}/sections`).send({ name: "Z" });

    const student = await admin.post("/api/admin/users").send({
      email: `mismatch-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Mis",
      lastName: "Match",
      classId,
      sectionId,
      academicYearId,
      rollNumber: "9",
    });
    const studentId = student.body.data.profile._id;

    // sectionId belongs to otherClass's own section list, not to classId - must be rejected.
    const badTransfer = await admin.post(`/api/classes/students/${studentId}/transfer`).send({
      classId,
      sectionId: otherSection.body.data._id,
      rollNumber: "10",
    });
    expect(badTransfer.status).toBe(400);
  });

  it("rejects a transfer to a non-existent class", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await admin.post("/api/admin/users").send({
      email: `badclass-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Bad",
      lastName: "Class",
      classId,
      sectionId,
      academicYearId,
      rollNumber: "11",
    });
    const studentId = student.body.data.profile._id;

    const fakeClassId = "0".repeat(24);
    const res = await admin.post(`/api/classes/students/${studentId}/transfer`).send({
      classId: fakeClassId,
      sectionId,
      rollNumber: "12",
    });
    expect(res.status).toBe(404);
  });

  it("on a partial bulk-promotion failure, succeeds for students with a free roll number and leaves the colliding student's enrollment fully intact (not broken or duplicated)", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId: sourceClassId, sectionId: sourceSectionId } = await seedAcademicStructure(app, adminToken);
    const targetClass = await admin.post("/api/classes").send({ name: `Target-${unique()}`, academicYearId });
    const targetClassId = targetClass.body.data._id;
    const targetSection = await admin.post(`/api/classes/${targetClassId}/sections`).send({ name: "A" });
    const targetSectionId = targetSection.body.data._id;

    // The target section already has an active student on roll "1" - this will collide.
    await admin.post("/api/admin/users").send({
      email: `occupant-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Occupant",
      lastName: "Already",
      classId: targetClassId,
      sectionId: targetSectionId,
      academicYearId,
      rollNumber: "1",
    });

    // Two students in the source section: roll "1" (will collide) and roll "2" (will succeed).
    const collider = await admin.post("/api/admin/users").send({
      email: `collider-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Will",
      lastName: "Collide",
      classId: sourceClassId,
      sectionId: sourceSectionId,
      academicYearId,
      rollNumber: "1",
    });
    const colliderId = collider.body.data.profile._id;
    const survivor = await admin.post("/api/admin/users").send({
      email: `survivor-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Will",
      lastName: "Succeed",
      classId: sourceClassId,
      sectionId: sourceSectionId,
      academicYearId,
      rollNumber: "2",
    });
    const survivorId = survivor.body.data.profile._id;

    const colliderBefore = await admin.get(`/api/enrollments?studentId=${colliderId}`);
    expect(colliderBefore.body.data.filter((e: any) => e.status === "active")).toHaveLength(1);

    // Simulate the frontend's promotion loop: one call per student, independently.
    const [colliderRes, survivorRes] = await Promise.all([
      admin.post(`/api/classes/students/${colliderId}/transfer`).send({ classId: targetClassId, sectionId: targetSectionId, rollNumber: "1" }),
      admin.post(`/api/classes/students/${survivorId}/transfer`).send({ classId: targetClassId, sectionId: targetSectionId, rollNumber: "2" }),
    ]);

    expect(colliderRes.status).toBe(409);
    expect(survivorRes.status).toBe(200);

    // The colliding student must still have exactly one ACTIVE enrollment, unchanged, still in the
    // source section - not zero (broken), not two (duplicated), not silently moved.
    const colliderAfter = await admin.get(`/api/enrollments?studentId=${colliderId}`);
    const colliderActive = colliderAfter.body.data.filter((e: any) => e.status === "active");
    expect(colliderActive).toHaveLength(1);
    expect(String(colliderActive[0].classId?._id ?? colliderActive[0].classId)).toBe(String(sourceClassId));
    expect(String(colliderActive[0].sectionId?._id ?? colliderActive[0].sectionId)).toBe(String(sourceSectionId));

    const colliderProfile = await admin.get(`/api/classes/${sourceClassId}/roster?sectionId=${sourceSectionId}`);
    expect(colliderProfile.body.data.some((s: any) => s._id === colliderId)).toBe(true);

    // The successful student must now show exactly one active enrollment, in the target section.
    const survivorAfter = await admin.get(`/api/enrollments?studentId=${survivorId}`);
    const survivorActive = survivorAfter.body.data.filter((e: any) => e.status === "active");
    expect(survivorActive).toHaveLength(1);
    expect(String(survivorActive[0].classId?._id ?? survivorActive[0].classId)).toBe(String(targetClassId));
  });
});

describe("student transfer and cross-year promotion", () => {
  it("moves the student's academicYearId to the target class's year and preserves history in Enrollment", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const yearA = await admin.post("/api/academic-years").send({ name: `YA-${unique()}`, startDate: "2025-01-01", endDate: "2025-12-31" });
    const yearAId = yearA.body.data._id;
    await admin.post(`/api/academic-years/${yearAId}/activate`);
    const classA = await admin.post("/api/classes").send({ name: `Class9-${unique()}`, academicYearId: yearAId });
    const classAId = classA.body.data._id;
    const sectionA = await admin.post(`/api/classes/${classAId}/sections`).send({ name: "A" });
    const sectionAId = sectionA.body.data._id;

    const studentRes = await admin.post("/api/admin/users").send({
      email: `promo-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Promo",
      lastName: "Test",
      classId: classAId,
      sectionId: sectionAId,
      academicYearId: yearAId,
      rollNumber: "5",
    });
    const studentId = studentRes.body.data.profile._id;

    const yearB = await admin.post("/api/academic-years").send({ name: `YB-${unique()}`, startDate: "2026-01-01", endDate: "2026-12-31" });
    const yearBId = yearB.body.data._id;
    const classB = await admin.post("/api/classes").send({ name: `Class10-${unique()}`, academicYearId: yearBId });
    const classBId = classB.body.data._id;
    const sectionB = await admin.post(`/api/classes/${classBId}/sections`).send({ name: "A" });
    const sectionBId = sectionB.body.data._id;

    const transferRes = await admin.post(`/api/classes/students/${studentId}/transfer`).send({
      classId: classBId,
      sectionId: sectionBId,
      rollNumber: "12",
    });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.academicYearId).toBe(yearBId);
    expect(transferRes.body.data.classId).toBe(classBId);

    const enrollments = await admin.get(`/api/enrollments?studentId=${studentId}`);
    const active = enrollments.body.data.find((e: any) => e.status === "active");
    const transferred = enrollments.body.data.find((e: any) => e.status === "transferred");
    expect(active.academicYearId?._id ?? active.academicYearId).toBe(yearBId);
    expect(transferred.academicYearId?._id ?? transferred.academicYearId).toBe(yearAId);
  });
});

describe("subject class-applicability enforcement", () => {
  it("rejects a teaching assignment for a class the subject is not configured for, directly or via its academic group", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `tsub-${unique()}@school.test`);

    const otherClass = await admin.post("/api/classes").send({ name: `Other-${unique()}`, academicYearId });
    const otherClassId = otherClass.body.data._id;

    // Directly restricted via applicableClasses.
    const restrictedSubject = await admin
      .post("/api/subjects")
      .send({ name: `Restricted-${unique()}`, code: `RST${unique()}`, applicableClasses: [otherClassId] });
    const restrictedSubjectId = restrictedSubject.body.data._id;

    const deniedDirect = await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId,
      sectionId,
      subjectId: restrictedSubjectId,
      teacherId: teacher.profile._id,
    });
    expect(deniedDirect.status).toBe(400);

    const allowedDirect = await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId: otherClassId,
      sectionId: (await admin.post(`/api/classes/${otherClassId}/sections`).send({ name: "A" })).body.data._id,
      subjectId: restrictedSubjectId,
      teacherId: teacher.profile._id,
    });
    expect(allowedDirect.status).toBe(201);

    // Restricted via an academic group instead of a direct class list.
    const group = await admin.post("/api/academic-groups").send({ name: `Science-${unique()}`, classIds: [otherClassId] });
    const groupSubject = await admin
      .post("/api/subjects")
      .send({ name: `Physics-${unique()}`, code: `PHY${unique()}`, groupId: group.body.data._id });

    const deniedViaGroup = await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId,
      sectionId,
      subjectId: groupSubject.body.data._id,
      teacherId: teacher.profile._id,
    });
    expect(deniedViaGroup.status).toBe(400);

    // An unrestricted subject (no group, no applicableClasses) applies to any class.
    const openSubject = await admin.post("/api/subjects").send({ name: `Open-${unique()}`, code: `OPN${unique()}` });
    const allowedOpen = await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId,
      sectionId,
      subjectId: openSubject.body.data._id,
      teacherId: teacher.profile._id,
    });
    expect(allowedOpen.status).toBe(201);
  });

  it("rejects an examination configured with a subject that is not applicable to its class", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId } = await seedAcademicStructure(app, adminToken);

    const otherClass = await admin.post("/api/classes").send({ name: `ExamOther-${unique()}`, academicYearId });
    const restrictedSubject = await admin
      .post("/api/subjects")
      .send({ name: `ExamRestricted-${unique()}`, code: `EXR${unique()}`, applicableClasses: [otherClass.body.data._id] });

    const deniedExam = await admin.post("/api/examinations").send({
      name: `Midterm-${unique()}`,
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId: restrictedSubject.body.data._id, maxMarks: 100, passMarks: 33 }],
    });
    expect(deniedExam.status).toBe(400);
  });
});
