import { Schema, model, Document, Types } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: Types.ObjectId;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ["present", "absent", "late", "excused"], required: true },
    remarks: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, sectionId: 1, date: 1 });

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);
