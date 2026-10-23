import { Schema, model, Document, Types } from "mongoose";

export interface ILeaveApplication extends Document {
  _id: Types.ObjectId;
  applicantId: Types.ObjectId;
  applicantRole: "student" | "teacher" | "staff";
  fromDate: Date;
  toDate: Date;
  reason: string;
  attachments: { url: string; publicId: string; filename: string }[];
  status: "pending" | "approved" | "rejected";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveApplicationSchema = new Schema<ILeaveApplication>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicantRole: { type: String, enum: ["student", "teacher", "staff"], required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    attachments: [{ url: String, publicId: String, filename: String }],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true },
);

export const LeaveApplication = model<ILeaveApplication>("LeaveApplication", leaveApplicationSchema);
