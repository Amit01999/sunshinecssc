import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("timetable integration with teaching assignments", () => {
  it("rejects a slot for a teacher/subject with no matching teaching assignment in that class/section", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `tt-${unique()}@school.test`);

    // No teaching assignment created for this teacher/subject/section - must be rejected.
    const denied = await admin.post("/api/timetable").send({
      academicYearId,
      classId,
      sectionId,
      dayOfWeek: 0,
      periodIndex: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectId,
      teacherId: teacher.profile._id,
    });
    expect(denied.status).toBe(400);

    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const allowed = await admin.post("/api/timetable").send({
      academicYearId,
      classId,
      sectionId,
      dayOfWeek: 0,
      periodIndex: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectId,
      teacherId: teacher.profile._id,
    });
    expect(allowed.status).toBe(201);
  });

  it("rejects a duplicate slot in the same class/section/day/period, and a double-booked teacher in a different class at the same time", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId, subjectId } = await seedAcademicStructure(app, adminToken);
    const teacher = await createUserAndLogin(app, ROLES.TEACHER, `tt2-${unique()}@school.test`);
    await admin.post("/api/teaching-assignments").send({ academicYearId, classId, sectionId, subjectId, teacherId: teacher.profile._id });

    const first = await admin.post("/api/timetable").send({
      academicYearId,
      classId,
      sectionId,
      dayOfWeek: 1,
      periodIndex: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectId,
      teacherId: teacher.profile._id,
    });
    expect(first.status).toBe(201);

    // Same class/section/day/period, different subject row attempt - the unique index blocks it outright.
    const subject2 = await admin.post("/api/subjects").send({ name: `Dup-${unique()}`, code: `DUP${unique()}` });
    await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId,
      sectionId,
      subjectId: subject2.body.data._id,
      teacherId: teacher.profile._id,
    });
    const duplicateSlot = await admin.post("/api/timetable").send({
      academicYearId,
      classId,
      sectionId,
      dayOfWeek: 1,
      periodIndex: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectId: subject2.body.data._id,
      teacherId: teacher.profile._id,
    });
    expect(duplicateSlot.status).toBe(409);

    // Same teacher, same day/period, a different class entirely - must be rejected as a double-booking.
    const otherClass = await admin.post("/api/classes").send({ name: `TTOther-${unique()}`, academicYearId });
    const otherSection = await admin.post(`/api/classes/${otherClass.body.data._id}/sections`).send({ name: "A" });
    await admin.post("/api/teaching-assignments").send({
      academicYearId,
      classId: otherClass.body.data._id,
      sectionId: otherSection.body.data._id,
      subjectId,
      teacherId: teacher.profile._id,
    });
    const doubleBooked = await admin.post("/api/timetable").send({
      academicYearId,
      classId: otherClass.body.data._id,
      sectionId: otherSection.body.data._id,
      dayOfWeek: 1,
      periodIndex: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectId,
      teacherId: teacher.profile._id,
    });
    expect(doubleBooked.status).toBe(409);
  });
});
