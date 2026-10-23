import { describe, it, expect, vi } from "vitest";

vi.mock("../src/utils/uploadToCloudinary", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/uploadToCloudinary")>(
    "../src/utils/uploadToCloudinary",
  );
  let counter = 0;
  return {
    ...actual,
    uploadBuffer: vi.fn(async () => {
      counter += 1;
      return { url: `https://res.cloudinary.com/demo/image/upload/fake-${counter}.jpg`, publicId: `fake-${counter}`, bytes: 123, resourceType: "image" };
    }),
    destroyAsset: vi.fn(async () => undefined),
  };
});

import request from "supertest";
import { createApp } from "../src/app";
import { ROLES } from "../src/utils/roles";
import { loginAsAdmin, authed, createUserAndLogin } from "./helpers";

const app = createApp();

describe("homepage hero CMS", () => {
  it("keeps draft changes private, publishes them to the public endpoint, and lets uploads be mocked end to end", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const addRes = await request(app)
      .post("/api/cms/homepage/draft/slides")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("heading", "Welcome to Sunshine")
      .field("subheading", "Draft heading not yet public")
      .attach("image", Buffer.from("fake-image-bytes"), "hero.jpg");
    expect(addRes.status).toBe(200);
    expect(addRes.body.data.heroSlides).toHaveLength(1);
    expect(addRes.body.data.heroSlides[0].imageUrl).toMatch(/cloudinary/);

    const publicBefore = await request(app).get("/api/cms/homepage/public");
    expect(publicBefore.body.data.heroSlides).toHaveLength(0);

    const publishRes = await admin.post("/api/cms/homepage/publish");
    expect(publishRes.status).toBe(200);

    const publicAfter = await request(app).get("/api/cms/homepage/public");
    expect(publicAfter.body.data.heroSlides).toHaveLength(1);
    expect(publicAfter.body.data.heroSlides[0].heading).toBe("Welcome to Sunshine");
  });

  it("blocks a non-admin staff account from changing CMS content", async () => {
    const staff = await createUserAndLogin(app, ROLES.STAFF, `staff-${Date.now()}@school.test`);
    const res = await authed(app, staff.token).post("/api/cms/homepage/publish");
    expect(res.status).toBe(403);
  });
});

describe("homepage messages section CMS", () => {
  it("edits the section title and a card's text/image in draft, keeps it off the public endpoint until published", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const titleRes = await admin.patch("/api/cms/homepage/draft/messages-section").send({ sectionTitle: "Words From Our Leaders" });
    expect(titleRes.status).toBe(200);
    expect(titleRes.body.data.messagesSection.sectionTitle).toBe("Words From Our Leaders");

    const cardRes = await admin
      .patch("/api/cms/homepage/draft/messages-section/cards/0")
      .send({ title: "Founder's Note", name: "Jane Doe", role: "Founder", text: "Welcome!" });
    expect(cardRes.status).toBe(200);
    expect(cardRes.body.data.messagesSection.cards[0]).toMatchObject({
      title: "Founder's Note",
      name: "Jane Doe",
      role: "Founder",
      text: "Welcome!",
      link: "/message/founder",
    });

    const imageRes = await request(app)
      .post("/api/cms/homepage/draft/messages-section/cards/0/image")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", Buffer.from("fake-image-bytes"), "founder.jpg");
    expect(imageRes.status).toBe(200);
    expect(imageRes.body.data.messagesSection.cards[0].imageUrl).toMatch(/cloudinary/);

    const publicBefore = await request(app).get("/api/cms/homepage/public");
    expect(publicBefore.body.data.messagesSection.cards).toHaveLength(0);

    await admin.post("/api/cms/homepage/publish");

    const publicAfter = await request(app).get("/api/cms/homepage/public");
    expect(publicAfter.body.data.messagesSection.sectionTitle).toBe("Words From Our Leaders");
    expect(publicAfter.body.data.messagesSection.cards[0].name).toBe("Jane Doe");
    expect(publicAfter.body.data.messagesSection.cards[0].imageUrl).toMatch(/cloudinary/);

    const removeImageRes = await admin.delete("/api/cms/homepage/draft/messages-section/cards/0/image");
    expect(removeImageRes.status).toBe(200);
    expect(removeImageRes.body.data.messagesSection.cards[0].imageUrl).toBeUndefined();
  });

  it("rejects an out-of-range card index", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const res = await admin.patch("/api/cms/homepage/draft/messages-section/cards/9").send({ name: "Nobody" });
    expect(res.status).toBe(400);
  });
});

describe("notices visibility", () => {
  it("only shows published, non-expired, audience-matched notices and hides drafts from the public feed", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    await admin.post("/api/notices").send({ title: "Draft notice", body: "not yet", status: "draft", audience: "all" });
    await admin.post("/api/notices").send({ title: "Public notice", body: "hello everyone", status: "published", audience: "all" });
    await admin
      .post("/api/notices")
      .send({ title: "Teachers only", body: "staff meeting", status: "published", audience: "teachers" });

    const publicNotices = await request(app).get("/api/notices/public");
    const titles = publicNotices.body.data.map((n: { title: string }) => n.title);
    expect(titles).toContain("Public notice");
    expect(titles).not.toContain("Draft notice");
    expect(titles).not.toContain("Teachers only");
  });
});

describe("news articles", () => {
  it("generates unique slugs for duplicate titles and keeps drafts out of the public API", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const first = await admin.post("/api/news").send({ title: "School Wins Award", body: "Body text", status: "published" });
    const second = await admin.post("/api/news").send({ title: "School Wins Award", body: "Different body", status: "draft" });

    expect(first.body.data.slug).toBe("school-wins-award");
    expect(second.body.data.slug).toBe("school-wins-award-2");

    const publicGet = await request(app).get(`/api/news/public/${second.body.data.slug}`);
    expect(publicGet.status).toBe(404); // draft, not public yet

    const publicList = await request(app).get("/api/news/public");
    expect(publicList.body.data.map((a: { slug: string }) => a.slug)).toEqual(["school-wins-award"]);
  });

  it("lets an admin attach, replace, and remove an article's optional featured image", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);

    const article = await admin.post("/api/news").send({ title: "Optional Image Article", body: "Body text", status: "published" });
    expect(article.body.data.featuredImage).toBeUndefined();

    const uploadRes = await request(app)
      .post(`/api/news/${article.body.data._id}/image`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", Buffer.from("fake-image-bytes"), "news.jpg");
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.featuredImage.url).toMatch(/cloudinary/);

    const publicGet = await request(app).get(`/api/news/public/${article.body.data.slug}`);
    expect(publicGet.body.data.featuredImage.url).toMatch(/cloudinary/);

    const removeRes = await admin.delete(`/api/news/${article.body.data._id}/image`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.featuredImage).toBeUndefined();
  });
});
