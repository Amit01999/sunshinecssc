import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin, seedAcademicStructure, unique } from "./helpers";

const app = createApp();

describe("dashboard summary notices stay in sync with /notices/mine", () => {
  it("never surfaces a notice on the student dashboard that /notices/mine would hide (wrong audience, wrong class, or not yet published)", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const otherClass = await admin.post("/api/classes").send({ name: `Other-${unique()}`, academicYearId });
    const otherClassId = otherClass.body.data._id;

    const student = await createUserAndLogin(app, ROLES.STUDENT, `syncnotice-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "1",
      academicYearId,
    });

    await admin.post("/api/notices").send({ title: "Teachers Only", body: "staff meeting", audience: "teachers", status: "published" });
    await admin.post("/api/notices").send({ title: "Other Class Only", body: "field trip", audience: "class", classId: otherClassId, status: "published" });
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    await admin.post("/api/notices").send({ title: "Not Yet Published", body: "later", audience: "all", status: "published", publishAt: future.toISOString() });
    await admin.post("/api/notices").send({ title: "For Everyone", body: "hello", audience: "all", status: "published" });
    await admin.post("/api/notices").send({ title: "My Class Only", body: "class trip", audience: "class", classId, status: "published" });

    const studentAuth = authed(app, student.token);
    const mine = await studentAuth.get("/api/notices/mine");
    const mineTitles = mine.body.data.map((n: any) => n.title).sort();

    const summary = await studentAuth.get("/api/dashboard/summary");
    expect(summary.status).toBe(200);
    const summaryTitles = summary.body.data.notices.map((n: any) => n.title).sort();

    expect(summaryTitles).toEqual(mineTitles);
    expect(summaryTitles).toEqual(["For Everyone", "My Class Only"]);
    expect(summaryTitles).not.toContain("Teachers Only");
    expect(summaryTitles).not.toContain("Other Class Only");
    expect(summaryTitles).not.toContain("Not Yet Published");
  });
});

describe("visible events (GET /events/mine and /events/public) are scoped to upcoming only", () => {
  it("excludes past events and sorts soonest-first, instead of being stuck on the oldest ever created", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    await admin.post("/api/events").send({ title: `Ancient-${unique()}`, startDate: "2001-01-01", status: "published" });
    await admin.post("/api/events").send({ title: `SoonUpcoming-${unique()}`, startDate: "2099-01-01", status: "published" });
    const laterTitle = `LaterUpcoming-${unique()}`;
    await admin.post("/api/events").send({ title: laterTitle, startDate: "2099-06-01", status: "published" });

    const res = await admin.get("/api/events/mine");
    expect(res.status).toBe(200);
    const titles = res.body.data.map((e: any) => e.title);
    expect(titles.some((t: string) => t.startsWith("Ancient"))).toBe(false);

    const soonIdx = titles.findIndex((t: string) => t.startsWith("SoonUpcoming"));
    const laterIdx = titles.indexOf(laterTitle);
    expect(soonIdx).toBeGreaterThanOrEqual(0);
    expect(laterIdx).toBeGreaterThan(soonIdx); // soonest upcoming event first
  });

  it("still enforces audience scoping for a student alongside the new date filter", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);
    const student = await createUserAndLogin(app, ROLES.STUDENT, `evtscope-${unique()}@school.test`, {
      classId,
      sectionId,
      rollNumber: "2",
      academicYearId,
    });

    await admin.post("/api/events").send({ title: "Staff Retreat", startDate: "2099-01-01", status: "published", audience: "staff" });
    await admin.post("/api/events").send({ title: "School Fair", startDate: "2099-01-01", status: "published", audience: "all" });

    const res = await authed(app, student.token).get("/api/events/mine");
    const titles = res.body.data.map((e: any) => e.title);
    expect(titles).toContain("School Fair");
    expect(titles).not.toContain("Staff Retreat");
  });
});
