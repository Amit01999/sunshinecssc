import { Schema, model, Document, Types } from "mongoose";
import { IAssignmentFile } from "./Assignment.model";

export interface ILearningMaterial extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  title: string;
  description?: string;
  files: IAssignmentFile[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IAssignmentFile>(
  { url: String, publicId: String, filename: String },
  { _id: false },
);

const learningMaterialSchema = new Schema<ILearningMaterial>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section" },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    files: { type: [fileSchema], default: [] },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const LearningMaterial = model<ILearningMaterial>("LearningMaterial", learningMaterialSchema);
