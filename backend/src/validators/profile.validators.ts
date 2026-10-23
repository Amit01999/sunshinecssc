import { z } from "zod";

export const updateOwnProfileSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  occupation: z.string().optional(),
});

export const profileChangeRequestSchema = z.object({
  requestedChanges: z.record(z.string(), z.unknown()),
  reason: z.string().optional(),
});

export const reviewProfileChangeSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
});
