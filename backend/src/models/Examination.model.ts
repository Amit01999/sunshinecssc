import { Schema, model, Document, Types } from "mongoose";

export interface IExamSubjectConfig {
  subjectId: Types.ObjectId;
  maxMarks: number;
  passMarks: number;
  examDate?: Date;
}

export interface IExamination extends Document {
  _id: Types.ObjectId;
  name: string;
  examType: string;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  subjects: IExamSubjectConfig[];
  status: "scheduled" | "ongoing" | "completed";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examSubjectConfigSchema = new Schema<IExamSubjectConfig>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    maxMarks: { type: Number, required: true, min: 1 },
    passMarks: { type: Number, required: true, min: 0 },
    examDate: { type: Date },
  },
  { _id: false },
);

const examinationSchema = new Schema<IExamination>(
  {
    name: { type: String, required: true, trim: true },
    examType: { type: String, required: true, trim: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    subjects: { type: [examSubjectConfigSchema], default: [] },
    status: { type: String, enum: ["scheduled", "ongoing", "completed"], default: "scheduled", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Examination = model<IExamination>("Examination", examinationSchema);
