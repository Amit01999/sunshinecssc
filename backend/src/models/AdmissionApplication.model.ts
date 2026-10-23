import { Schema, model, Document, Types } from "mongoose";

export interface IAdmissionApplication extends Document {
  _id: Types.ObjectId;
  applicantName: string;
  dateOfBirth: Date;
  gender?: "male" | "female" | "other";
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  appliedClassId: Types.ObjectId;
  documents: { url: string; publicId: string; filename: string }[];
  status: "pending" | "under_review" | "info_requested" | "approved" | "rejected";
  reviewNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdStudentUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const admissionApplicationSchema = new Schema<IAdmissionApplication>(
  {
    applicantName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    guardianName: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true, trim: true },
    guardianEmail: { type: String, trim: true, lowercase: true },
    appliedClassId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true },
    documents: [{ url: String, publicId: String, filename: String }],
    status: {
      type: String,
      enum: ["pending", "under_review", "info_requested", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    createdStudentUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const AdmissionApplication = model<IAdmissionApplication>("AdmissionApplication", admissionApplicationSchema);
