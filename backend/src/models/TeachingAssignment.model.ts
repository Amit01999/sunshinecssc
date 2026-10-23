import { Schema, model, Document, Types } from "mongoose";

/** Links a teacher to a subject for a specific class/section/year - drives teacher-scoped authorization. */
export interface ITeachingAssignment extends Document {
  _id: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teachingAssignmentSchema = new Schema<ITeachingAssignment>(
  {
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true, index: true },
  },
  { timestamps: true },
);

teachingAssignmentSchema.index(
  { academicYearId: 1, classId: 1, sectionId: 1, subjectId: 1 },
  { unique: true },
);

export const TeachingAssignment = model<ITeachingAssignment>("TeachingAssignment", teachingAssignmentSchema);
