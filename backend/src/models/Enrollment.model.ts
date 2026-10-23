import { Schema, model, Document, Types } from "mongoose";

export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  rollNumber: string;
  status: "active" | "transferred" | "completed";
  enrolledAt: Date;
  transferredAt?: Date;
  previousClassId?: Types.ObjectId;
  previousSectionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    rollNumber: { type: String, required: true },
    status: { type: String, enum: ["active", "transferred", "completed"], default: "active", index: true },
    enrolledAt: { type: Date, default: Date.now },
    transferredAt: { type: Date },
    previousClassId: { type: Schema.Types.ObjectId, ref: "SchoolClass" },
    previousSectionId: { type: Schema.Types.ObjectId, ref: "Section" },
  },
  { timestamps: true },
);

// Only the student's current ("active") enrollment record is constrained to a unique roll
// number per section - transfers leave behind "transferred" history rows that may legitimately
// share a now-vacated roll number with a later student.
enrollmentSchema.index(
  { academicYearId: 1, classId: 1, sectionId: 1, rollNumber: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);
enrollmentSchema.index({ studentId: 1, academicYearId: 1 });

export const Enrollment = model<IEnrollment>("Enrollment", enrollmentSchema);
