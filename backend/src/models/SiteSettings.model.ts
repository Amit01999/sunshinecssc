import { Schema, model, Document, Types } from "mongoose";

export interface ISiteSettings extends Document {
  _id: Types.ObjectId;
  schoolName: string;
  tagline?: string;
  logoUrl?: string;
  logoPublicId?: string;
  faviconUrl?: string;
  faviconPublicId?: string;
  address?: string;
  phones: string[];
  emails: string[];
  officeHours?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  footerText?: string;
  seoTitle?: string;
  seoDescription?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    schoolName: { type: String, required: true, default: "Chittagong Sunshine School & College" },
    tagline: { type: String },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    faviconUrl: { type: String },
    faviconPublicId: { type: String },
    address: { type: String },
    phones: { type: [String], default: [] },
    emails: { type: [String], default: [] },
    officeHours: { type: String },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String,
    },
    footerText: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const SiteSettings = model<ISiteSettings>("SiteSettings", siteSettingsSchema);
