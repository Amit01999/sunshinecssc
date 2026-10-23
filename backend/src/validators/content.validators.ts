import { z } from "zod";

const audienceEnum = z.enum(["all", "students", "parents", "teachers", "staff", "class"]);

export const createNoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: audienceEnum.optional(),
  classId: z.string().optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  audience: audienceEnum.optional(),
  classId: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const createNewsArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  body: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const updateNewsArticleSchema = createNewsArticleSchema.partial();

export const createGalleryAlbumSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  isPublished: z.boolean().optional(),
});

export const updateGalleryImageSchema = z.object({
  albumId: z.string().optional(),
  caption: z.string().optional(),
  altText: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
});
