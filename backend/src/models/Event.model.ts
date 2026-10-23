import { Schema, model, Document, Types } from "mongoose";
import { NoticeAudience } from "./Notice.model";

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  image?: { url: string; publicId: string };
  audience: NoticeAudience;
  classId?: Types.ObjectId;
  status: "draft" | "published" | "archived";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date },
    image: { url: String, publicId: String },
    audience: {
      type: String,
      enum: ["all", "students", "parents", "teachers", "staff", "class"],
      default: "all",
    },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Event = model<IEvent>("Event", eventSchema);
