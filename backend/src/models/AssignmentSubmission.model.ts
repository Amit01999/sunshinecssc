import { Schema, model, Document, Types } from "mongoose";
import { IAssignmentFile } from "./Assignment.model";

export interface IAssignmentSubmission extends Document {
  _id: Types.ObjectId;
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  textAnswer?: string;
  files: IAssignmentFile[];
  submittedAt: Date;
  isLate: boolean;
  status: "submitted" | "graded" | "returned";
  marksObtained?: number;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IAssignmentFile>(
  { url: String, publicId: String, filename: String },
  { _id: false },
);

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    textAnswer: { type: String },
    files: { type: [fileSchema], default: [] },
    submittedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ["submitted", "graded", "returned"], default: "submitted", index: true },
    marksObtained: { type: Number, min: 0 },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    gradedAt: { type: Date },
  },
  { timestamps: true },
);

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const AssignmentSubmission = model<IAssignmentSubmission>("AssignmentSubmission", assignmentSubmissionSchema);
