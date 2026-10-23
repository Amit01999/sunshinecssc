import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

/** Admin-only draft -> submit -> approve -> publish, the shortest path to a status that is
 *  actually visible to students/parents (who are always forced to status=published). */
async function submitApprovePublish(adminToken: string, resultIds: string[]) {
  const admin = authed(app, adminToken);
  await admin.post("/api/examinations/results/submit").send({ resultIds });
  await admin.post("/api/examinations/results/approve").send({ resultIds });
  const res = await admin.post("/api/examinations/results/publish").send({ resultIds });
  expect(res.status).toBe(200);
}

describe("examination results: grouping data contract (GET /examinations/results/all)", () => {
  it("attaches each published result's own examination's subject config (maxMarks/passMarks/name), so an examination can be totaled without a second fetch", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const subjectB = await admin.post("/api/subjects").send({ name: `Second-${unique()}`, code: `SEC${unique()}` });
    const subjectBId = subjectB.body.data._id;

    const student = await createUserAndLogin(app, ROLES.STUDENT, `contract-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });

    const exam = await admin.post("/api/examinations").send({
      name: "Contract Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [
        { subjectId, maxMarks: 100, passMarks: 40 },
        { subjectId: subjectBId, maxMarks: 50, passMarks: 20 },
      ],
    });
    const examinationId = exam.body.data._id;

    const enter1 = await admin.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 80 }] });
    const enter2 = await admin.post(`/api/examinations/${examinationId}/marks`).send({ subjectId: subjectBId, marks: [{ studentId: student.profile._id, marksObtained: 35 }] });
    await submitApprovePublish(adminToken, [enter1.body.data[0]._id, enter2.body.data[0]._id]);

    const studentAuth = authed(app, student.token);
    const res = await studentAuth.get("/api/examinations/results/all");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const row = res.body.data.find((r: any) => r.subjectId._id === subjectId);
    expect(row.examinationId.name).toBe("Contract Exam");
    expect(row.examinationId.academicYearId.name).toBeTruthy();
    expect(row.examinationId.classId.name).toBeTruthy();
    const configs = row.examinationId.subjects;
    expect(configs).toHaveLength(2);
    const myConfig = configs.find((c: any) => c.subjectId._id === subjectId);
    expect(myConfig).toMatchObject({ maxMarks: 100, passMarks: 40 });
    expect(myConfig.subjectId.name).toBeTruthy();
  });

  it("never fabricates a result for a configured-but-unpublished subject, and leaves a draft subject's marks invisible to the student", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const subjectB = await admin.post("/api/subjects").send({ name: `Unpublished-${unique()}`, code: `UNP${unique()}` });
    const subjectBId = subjectB.body.data._id;

    const student = await createUserAndLogin(app, ROLES.STUDENT, `partial-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });

    const exam = await admin.post("/api/examinations").send({
      name: "Partial Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [
        { subjectId, maxMarks: 100, passMarks: 33 },
        { subjectId: subjectBId, maxMarks: 100, passMarks: 33 },
      ],
    });
    const examinationId = exam.body.data._id;

    // Only one of the two configured subjects ever gets marks entered and published.
    const enter1 = await admin.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 70 }] });
    await submitApprovePublish(adminToken, [enter1.body.data[0]._id]);
    // The second subject's marks exist only as an unsubmitted draft.
    await admin.post(`/api/examinations/${examinationId}/marks`).send({ subjectId: subjectBId, marks: [{ studentId: student.profile._id, marksObtained: 10 }] });

    const studentAuth = authed(app, student.token);
    const res = await studentAuth.get(`/api/examinations/results/all?examinationId=${examinationId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1); // not 2 - the draft subject must not appear
    expect(res.body.data[0].subjectId._id).toBe(subjectId);
    expect(res.body.data[0].marksObtained).toBe(70);
  });

  it("returns no rows (not a fabricated entry) for an examination with zero published results for this student", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `nopublish-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "3",
      academicYearId,
    });

    const exam = await admin.post("/api/examinations").send({
      name: "Never Published Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const examinationId = exam.body.data._id;
    await admin.post(`/api/examinations/${examinationId}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 55 }] });
    // Left in draft - never submitted, approved, or published.

    const studentAuth = authed(app, student.token);
    const res = await studentAuth.get(`/api/examinations/results/all?examinationId=${examinationId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("keeps two examinations separate even when they reuse the same subject with different mark configurations", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `reuse-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "4",
      academicYearId,
    });

    const examMid = await admin.post("/api/examinations").send({
      name: "Midterm",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 40 }],
    });
    const examFinal = await admin.post("/api/examinations").send({
      name: "Final",
      examType: "final",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 30, passMarks: 10 }], // same subject, a different weight
    });

    const enterMid = await admin.post(`/api/examinations/${examMid.body.data._id}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 90 }] });
    const enterFinal = await admin.post(`/api/examinations/${examFinal.body.data._id}/marks`).send({ subjectId, marks: [{ studentId: student.profile._id, marksObtained: 25 }] });
    await submitApprovePublish(adminToken, [enterMid.body.data[0]._id, enterFinal.body.data[0]._id]);

    const studentAuth = authed(app, student.token);
    const res = await studentAuth.get("/api/examinations/results/all");
    expect(res.body.data).toHaveLength(2);

    const midRow = res.body.data.find((r: any) => r.examinationId.name === "Midterm");
    const finalRow = res.body.data.find((r: any) => r.examinationId.name === "Final");
    expect(midRow.marksObtained).toBe(90);
    expect(midRow.examinationId.subjects.find((c: any) => c.subjectId._id === subjectId).maxMarks).toBe(100);
    expect(finalRow.marksObtained).toBe(25);
    expect(finalRow.examinationId.subjects.find((c: any) => c.subjectId._id === subjectId).maxMarks).toBe(30);
  });

  it("keeps a promoted student's results separated by academic year, with neither exam leaking into the other", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId: yearAId, classId: classAId, sectionId: sectionAId, subjectId: subjectAId } = await seedAcademicStructure(app, adminToken);

    const student = await createUserAndLogin(app, ROLES.STUDENT, `promoted-${unique()}@school.test`, {
      classId: classAId,
      sectionId: sectionAId,
      rollNumber: "5",
      academicYearId: yearAId,
    });

    const examA = await admin.post("/api/examinations").send({
      name: "Year A Exam",
      examType: "midterm",
      academicYearId: yearAId,
      classId: classAId,
      subjects: [{ subjectId: subjectAId, maxMarks: 100, passMarks: 33 }],
    });
    const enterA = await admin.post(`/api/examinations/${examA.body.data._id}/marks`).send({ subjectId: subjectAId, marks: [{ studentId: student.profile._id, marksObtained: 60 }] });
    await submitApprovePublish(adminToken, [enterA.body.data[0]._id]);

    const yearB = await admin.post("/api/academic-years").send({ name: `YrB-${unique()}`, startDate: "2030-01-01", endDate: "2030-12-31" });
    const yearBId = yearB.body.data._id;
    await admin.post(`/api/academic-years/${yearBId}/activate`);
    const classB = await admin.post("/api/classes").send({ name: `ClassB-${unique()}`, academicYearId: yearBId });
    const classBId = classB.body.data._id;
    const sectionB = await admin.post(`/api/classes/${classBId}/sections`).send({ name: "A" });
    const sectionBId = sectionB.body.data._id;
    const subjectB = await admin.post("/api/subjects").send({ name: `SubB-${unique()}`, code: `SB${unique()}` });
    const subjectBId = subjectB.body.data._id;

    await admin.post(`/api/classes/students/${student.profile._id}/transfer`).send({ classId: classBId, sectionId: sectionBId, rollNumber: "9" });

    const examB = await admin.post("/api/examinations").send({
      name: "Year B Exam",
      examType: "final",
      academicYearId: yearBId,
      classId: classBId,
      subjects: [{ subjectId: subjectBId, maxMarks: 50, passMarks: 20 }],
    });
    const enterB = await admin.post(`/api/examinations/${examB.body.data._id}/marks`).send({ subjectId: subjectBId, marks: [{ studentId: student.profile._id, marksObtained: 45 }] });
    await submitApprovePublish(adminToken, [enterB.body.data[0]._id]);

    const studentAuth = authed(app, student.token);
    const res = await studentAuth.get("/api/examinations/results/all");
    expect(res.body.data).toHaveLength(2);

    const rowA = res.body.data.find((r: any) => r.examinationId.name === "Year A Exam");
    const rowB = res.body.data.find((r: any) => r.examinationId.name === "Year B Exam");
    expect(rowA.examinationId.academicYearId._id).toBe(yearAId);
    expect(rowA.marksObtained).toBe(60);
    expect(rowA.examinationId.subjects).toHaveLength(1);
    expect(rowA.examinationId.subjects[0].subjectId._id).toBe(subjectAId);

    expect(rowB.examinationId.academicYearId._id).toBe(yearBId);
    expect(rowB.marksObtained).toBe(45);
    expect(rowB.examinationId.subjects[0].subjectId._id).toBe(subjectBId);

    // Historical year A result is still directly reachable by its own examinationId.
    const historical = await studentAuth.get(`/api/examinations/results/all?examinationId=${examA.body.data._id}`);
    expect(historical.body.data).toHaveLength(1);
    expect(historical.body.data[0].marksObtained).toBe(60);
  });

  it("never lets a student read another student's results by passing a different studentId", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `selfA-${unique()}@school.test`, { classId, sectionId, rollNumber: "6", academicYearId });
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `selfB-${unique()}@school.test`, { classId, sectionId, rollNumber: "7", academicYearId });

    const exam = await admin.post("/api/examinations").send({
      name: "Isolation Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const enterB = await admin.post(`/api/examinations/${exam.body.data._id}/marks`).send({ subjectId, marks: [{ studentId: studentB.profile._id, marksObtained: 99 }] });
    await submitApprovePublish(adminToken, [enterB.body.data[0]._id]);

    // studentA has no result of their own for this exam, and tries to read studentB's by id.
    const studentAAuth = authed(app, studentA.token);
    const res = await studentAAuth.get(`/api/examinations/results/all?studentId=${studentB.profile._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0); // forced back to studentA's own (empty) scope, never studentB's
  });

  it("lets a linked parent see a child's grouped-ready result exactly as the child sees it, and blocks an unlinked parent outright", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);

    const child = await admin.post("/api/admin/users").send({
      email: `child-${unique()}@school.test`,
      role: ROLES.STUDENT,
      firstName: "Child",
      lastName: "One",
      classId,
      sectionId,
      rollNumber: "8",
      academicYearId,
    });
    const childStudentId = child.body.data.profile._id;

    const exam = await admin.post("/api/examinations").send({
      name: "Parent View Exam",
      examType: "midterm",
      academicYearId,
      classId,
      subjects: [{ subjectId, maxMarks: 100, passMarks: 33 }],
    });
    const enter = await admin.post(`/api/examinations/${exam.body.data._id}/marks`).send({ subjectId, marks: [{ studentId: childStudentId, marksObtained: 77 }] });
    await submitApprovePublish(adminToken, [enter.body.data[0]._id]);

    const parent = await createUserAndLogin(app, ROLES.PARENT, `parent-${unique()}@school.test`);
    await admin.post(`/api/admin/users/students/${childStudentId}/parents`).send({ parentUserId: parent.userId, relationship: "father", isPrimary: true });

    const parentAuth = authed(app, parent.token);
    const linkedRes = await parentAuth.get(`/api/examinations/results/all?studentId=${childStudentId}`);
    expect(linkedRes.status).toBe(200);
    expect(linkedRes.body.data).toHaveLength(1);
    expect(linkedRes.body.data[0].marksObtained).toBe(77);
    expect(linkedRes.body.data[0].examinationId.subjects[0].maxMarks).toBe(100);

    const outsideParent = await createUserAndLogin(app, ROLES.PARENT, `outside-${unique()}@school.test`);
    const blockedRes = await authed(app, outsideParent.token).get(`/api/examinations/results/all?studentId=${childStudentId}`);
    expect(blockedRes.status).toBe(403);
  });
});
