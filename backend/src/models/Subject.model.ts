import { Schema, model, Document, Types } from "mongoose";

export interface ISubject extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  departmentId?: Types.ObjectId;
  description?: string;
  groupId?: Types.ObjectId;
  applicableClasses: Types.ObjectId[];
  isElective: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    description: { type: String },
    // If groupId is set, the subject applies only to that academic group's classes (groupId
    // takes precedence over applicableClasses). If neither is set, it applies to every class.
    groupId: { type: Schema.Types.ObjectId, ref: "AcademicGroup" },
    applicableClasses: [{ type: Schema.Types.ObjectId, ref: "SchoolClass" }],
    isElective: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Subject = model<ISubject>("Subject", subjectSchema);
