import { z } from "zod";

export const cmsSectionSchema = z.object({
  key: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  isVisible: z.boolean().optional(),
  order: z.number().optional(),
});

export const upsertCmsPageSchema = z.object({
  title: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sections: z.array(cmsSectionSchema).default([]),
  status: z.enum(["draft", "published"]).optional(),
});

export const heroSlideSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  focalPosition: z.string().optional(),
  order: z.number().optional(),
});

export const messagesSectionTitleSchema = z.object({
  sectionTitle: z.string().min(1),
});

export const messageCardSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  text: z.string().optional(),
});

export const siteSettingsSchema = z.object({
  schoolName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phones: z.array(z.string()).optional(),
  emails: z.array(z.string()).optional(),
  officeHours: z.string().optional(),
  socialLinks: z
    .object({
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
  footerText: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});
