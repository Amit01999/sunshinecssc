import { Schema, model, Document, Types } from "mongoose";

export interface IAssignmentFile {
  url: string;
  publicId: string;
  filename: string;
}

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  title: string;
  instructions?: string;
  attachments: IAssignmentFile[];
  maxMarks: number;
  dueDate: Date;
  status: "draft" | "published" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IAssignmentFile>(
  { url: String, publicId: String, filename: String },
  { _id: false },
);

const assignmentSchema = new Schema<IAssignment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String },
    attachments: { type: [fileSchema], default: [] },
    maxMarks: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["draft", "published", "closed"], default: "draft", index: true },
  },
  { timestamps: true },
);

export const Assignment = model<IAssignment>("Assignment", assignmentSchema);
