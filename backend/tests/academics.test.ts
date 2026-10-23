import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { User, hashPassword } from "../src/models/User.model";
import { StaffProfile } from "../src/models/StaffProfile.model";
import { ROLES } from "../src/utils/roles";

const app = createApp();

async function loginAsAdmin(email = "acadadmin@school.test") {
  const user = await User.create({ email, passwordHash: await hashPassword("Password123!"), role: ROLES.ADMIN, isActive: true });
  await StaffProfile.create({ userId: user._id, employeeId: `E-${email}`, firstName: "A", lastName: "B" });
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  return res.body.data.accessToken as string;
}

describe("academics", () => {
  it("builds the full academic structure and enrolls/transfers a student", async () => {
    const token = await loginAsAdmin();
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);

    const yearRes = await auth(
      request(app).post("/api/academic-years").send({ name: "2025-2026", startDate: "2025-01-01", endDate: "2025-12-31" }),
    );
    expect(yearRes.status).toBe(201);
    const academicYearId = yearRes.body.data._id;
    await auth(request(app).post(`/api/academic-years/${academicYearId}/activate`));

    const deptRes = await auth(
      request(app).post("/api/departments").send({ name: "Science", slug: "science", isPublished: true }),
    );
    expect(deptRes.status).toBe(201);

    const publicDepts = await request(app).get("/api/departments/public");
    expect(publicDepts.status).toBe(200);
    expect(publicDepts.body.data.some((d: { slug: string }) => d.slug === "science")).toBe(true);

    const subjectRes = await auth(
      request(app).post("/api/subjects").send({ name: "Physics", code: "PHY101", departmentId: deptRes.body.data._id }),
    );
    expect(subjectRes.status).toBe(201);

    const classRes = await auth(request(app).post("/api/classes").send({ name: "Class 9", academicYearId }));
    expect(classRes.status).toBe(201);
    const classId = classRes.body.data._id;

    const sectionARes = await auth(request(app).post(`/api/classes/${classId}/sections`).send({ name: "A" }));
    const sectionBRes = await auth(request(app).post(`/api/classes/${classId}/sections`).send({ name: "B" }));
    expect(sectionARes.status).toBe(201);
    const sectionAId = sectionARes.body.data._id;
    const sectionBId = sectionBRes.body.data._id;

    const teacherRes = await auth(
      request(app)
        .post("/api/admin/users")
        .send({ email: "physicsteacher@school.test", role: ROLES.TEACHER, firstName: "Phy", lastName: "Teacher" }),
    );
    expect(teacherRes.status).toBe(201);
    const teacherProfileId = teacherRes.body.data.profile._id;

    const assignRes = await auth(
      request(app).post("/api/teaching-assignments").send({
        academicYearId,
        classId,
        sectionId: sectionAId,
        subjectId: subjectRes.body.data._id,
        teacherId: teacherProfileId,
      }),
    );
    expect(assignRes.status).toBe(201);

    const studentRes = await auth(
      request(app).post("/api/admin/users").send({
        email: "student9a@school.test",
        role: ROLES.STUDENT,
        firstName: "Nine",
        lastName: "A",
        classId,
        sectionId: sectionAId,
        rollNumber: "1",
        academicYearId,
      }),
    );
    expect(studentRes.status).toBe(201);
    const studentId = studentRes.body.data.profile._id;

    const enrollmentsRes = await auth(request(app).get(`/api/enrollments?studentId=${studentId}`));
    expect(enrollmentsRes.status).toBe(200);
    expect(enrollmentsRes.body.data).toHaveLength(1);
    expect(enrollmentsRes.body.data[0].status).toBe("active");

    const transferRes = await auth(
      request(app)
        .post(`/api/classes/students/${studentId}/transfer`)
        .send({ classId, sectionId: sectionBId, rollNumber: "5" }),
    );
    expect(transferRes.status).toBe(200);
    expect(String(transferRes.body.data.sectionId)).toBe(String(sectionBId));

    const enrollmentsAfter = await auth(request(app).get(`/api/enrollments?studentId=${studentId}`));
    expect(enrollmentsAfter.body.data).toHaveLength(2);
    expect(enrollmentsAfter.body.data.filter((e: { status: string }) => e.status === "active")).toHaveLength(1);
    expect(enrollmentsAfter.body.data.filter((e: { status: string }) => e.status === "transferred")).toHaveLength(1);

    const rosterRes = await auth(request(app).get(`/api/classes/${classId}/roster?sectionId=${sectionBId}`));
    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data).toHaveLength(1);
  });

  it("exposes only the active year's classes on the public endpoint, with no auth required", async () => {
    const token = await loginAsAdmin("pubclasses@school.test");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);

    const yearA = await auth(request(app).post("/api/academic-years").send({ name: `PubA-${Date.now()}`, startDate: "2025-01-01", endDate: "2025-12-31" }));
    await auth(request(app).post(`/api/academic-years/${yearA.body.data._id}/activate`));
    const classOld = await auth(request(app).post("/api/classes").send({ name: `OldYearClass-${Date.now()}`, academicYearId: yearA.body.data._id }));

    const yearB = await auth(request(app).post("/api/academic-years").send({ name: `PubB-${Date.now()}`, startDate: "2026-01-01", endDate: "2026-12-31" }));
    await auth(request(app).post(`/api/academic-years/${yearB.body.data._id}/activate`));
    const classNew = await auth(request(app).post("/api/classes").send({ name: `NewYearClass-${Date.now()}`, academicYearId: yearB.body.data._id }));

    const publicRes = await request(app).get("/api/classes/public");
    expect(publicRes.status).toBe(200);
    const names = publicRes.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain(classNew.body.data.name);
    expect(names).not.toContain(classOld.body.data.name);
  });
});
