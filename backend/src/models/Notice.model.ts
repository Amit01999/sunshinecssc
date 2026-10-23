import { Schema, model, Document, Types } from "mongoose";

export type NoticeAudience = "all" | "students" | "parents" | "teachers" | "staff" | "class";

export interface INotice extends Document {
  _id: Types.ObjectId;
  title: string;
  body: string;
  attachments: { url: string; publicId: string; filename: string }[];
  audience: NoticeAudience;
  classId?: Types.ObjectId;
  isPinned: boolean;
  status: "draft" | "published" | "archived";
  publishAt?: Date;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    attachments: [{ url: String, publicId: String, filename: String }],
    audience: {
      type: String,
      enum: ["all", "students", "parents", "teachers", "staff", "class"],
      default: "all",
    },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass" },
    isPinned: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    publishAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

noticeSchema.index({ status: 1, isPinned: -1, createdAt: -1 });

export const Notice = model<INotice>("Notice", noticeSchema);
