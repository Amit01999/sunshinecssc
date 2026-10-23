import { Schema, model, Document, Types } from "mongoose";

export type ExamResultStatus = "draft" | "submitted" | "approved" | "published" | "rejected";

export interface IExamResult extends Document {
  _id: Types.ObjectId;
  examinationId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  status: ExamResultStatus;
  enteredBy: Types.ObjectId;
  submittedAt?: Date;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const examResultSchema = new Schema<IExamResult>(
  {
    examinationId: { type: Schema.Types.ObjectId, ref: "Examination", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    grade: { type: String },
    remarks: { type: String },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "published", "rejected"],
      default: "draft",
      index: true,
    },
    enteredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    rejectedReason: { type: String },
  },
  { timestamps: true },
);

examResultSchema.index({ examinationId: 1, studentId: 1, subjectId: 1 }, { unique: true });

export const ExamResult = model<IExamResult>("ExamResult", examResultSchema);
