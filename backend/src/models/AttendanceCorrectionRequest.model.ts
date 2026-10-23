import { Schema, model, Document, Types } from "mongoose";
import { AttendanceStatus } from "./Attendance.model";

export interface IAttendanceCorrectionRequest extends Document {
  _id: Types.ObjectId;
  attendanceId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceCorrectionRequestSchema = new Schema<IAttendanceCorrectionRequest>(
  {
    attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedStatus: { type: String, enum: ["present", "absent", "late", "excused"], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true },
);

export const AttendanceCorrectionRequest = model<IAttendanceCorrectionRequest>(
  "AttendanceCorrectionRequest",
  attendanceCorrectionRequestSchema,
);
