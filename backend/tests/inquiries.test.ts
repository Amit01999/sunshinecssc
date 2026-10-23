import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin } from "./helpers";

const app = createApp();

describe("inquiries (shared support queue)", () => {
  it("lets any teacher see and claim a general inquiry nobody has responded to yet, then hides it from other teachers", async () => {
    const parent = await createUserAndLogin(app, ROLES.PARENT, `inq-parent-${Date.now()}@school.test`);
    const teacherA = await createUserAndLogin(app, ROLES.TEACHER, `inq-teacher-a-${Date.now()}@school.test`);
    const teacherB = await createUserAndLogin(app, ROLES.TEACHER, `inq-teacher-b-${Date.now()}@school.test`);

    const parentAuth = authed(app, parent.token);
    const createRes = await parentAuth.post("/api/inquiries").send({ subject: "Question about fees", message: "What is the due date?" });
    expect(createRes.status).toBe(201);
    const inquiryId = createRes.body.data._id;

    // Not yet claimed by anyone - both teachers should see it in their shared pool.
    const teacherAAuth = authed(app, teacherA.token);
    const teacherBAuth = authed(app, teacherB.token);
    const poolA = await teacherAAuth.get("/api/inquiries/mine");
    const poolB = await teacherBAuth.get("/api/inquiries/mine");
    expect(poolA.body.data.map((i: { _id: string }) => i._id)).toContain(inquiryId);
    expect(poolB.body.data.map((i: { _id: string }) => i._id)).toContain(inquiryId);

    // Teacher A responds, claiming it.
    const respondRes = await teacherAAuth.post(`/api/inquiries/${inquiryId}/respond`).send({ message: "Due date is the 5th." });
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.data.toUserId._id ?? respondRes.body.data.toUserId).toBe(teacherA.userId);

    // Claimed - it should disappear from teacher B's pool, but stay in teacher A's.
    const poolAAfter = await teacherAAuth.get("/api/inquiries/mine");
    const poolBAfter = await teacherBAuth.get("/api/inquiries/mine");
    expect(poolAAfter.body.data.map((i: { _id: string }) => i._id)).toContain(inquiryId);
    expect(poolBAfter.body.data.map((i: { _id: string }) => i._id)).not.toContain(inquiryId);

    // Teacher B can no longer respond to it - it's already claimed by teacher A.
    const blockedRespond = await teacherBAuth.post(`/api/inquiries/${inquiryId}/respond`).send({ message: "I'll take this one too" });
    expect(blockedRespond.status).toBe(403);

    // The original sender sees the response.
    const parentView = await parentAuth.get("/api/inquiries/mine");
    const theirs = parentView.body.data.find((i: { _id: string }) => i._id === inquiryId);
    expect(theirs.responses).toHaveLength(1);
    expect(theirs.responses[0].message).toBe("Due date is the 5th.");
  });

  it("lets admin see every inquiry regardless of claim status, and a student never sees another student's inquiry", async () => {
    const adminToken = await loginAsAdmin(app);
    const studentA = await createUserAndLogin(app, ROLES.STUDENT, `inq-student-a-${Date.now()}@school.test`);
    const studentB = await createUserAndLogin(app, ROLES.STUDENT, `inq-student-b-${Date.now()}@school.test`);

    const studentAAuth = authed(app, studentA.token);
    const createRes = await studentAAuth.post("/api/inquiries").send({ subject: "Lost ID card", message: "Where do I report this?" });
    const inquiryId = createRes.body.data._id;

    const studentBAuth = authed(app, studentB.token);
    const studentBView = await studentBAuth.get("/api/inquiries/mine");
    expect(studentBView.body.data.map((i: { _id: string }) => i._id)).not.toContain(inquiryId);

    const adminView = await authed(app, adminToken).get("/api/inquiries");
    expect(adminView.status).toBe(200);
    expect(adminView.body.data.map((i: { _id: string }) => i._id)).toContain(inquiryId);
  });
});
