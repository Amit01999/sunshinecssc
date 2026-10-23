import { Schema, model, Document, Types } from "mongoose";

export const CMS_PAGE_KEYS = [
  "about",
  "founder-message",
  "director-message",
  "headmaster-message",
  "classes",
  "contact",
] as const;
export type CMSPageKey = (typeof CMS_PAGE_KEYS)[number];

export interface ICMSSection {
  key: string;
  type: string;
  data: Record<string, unknown>;
  isVisible: boolean;
  order: number;
}

export interface ICMSHistoryEntry {
  snapshot: Record<string, unknown>;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface ICMSPage extends Document {
  _id: Types.ObjectId;
  pageKey: CMSPageKey;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: ICMSSection[];
  status: "draft" | "published";
  updatedBy: Types.ObjectId;
  history: ICMSHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const cmsSectionSchema = new Schema<ICMSSection>(
  {
    key: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const cmsHistorySchema = new Schema<ICMSHistoryEntry>(
  {
    snapshot: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cmsPageSchema = new Schema<ICMSPage>(
  {
    pageKey: { type: String, enum: CMS_PAGE_KEYS, required: true, unique: true },
    title: { type: String, required: true },
    seoTitle: { type: String },
    seoDescription: { type: String },
    sections: { type: [cmsSectionSchema], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    history: { type: [cmsHistorySchema], default: [] },
  },
  { timestamps: true },
);

export const CMSPage = model<ICMSPage>("CMSPage", cmsPageSchema);
