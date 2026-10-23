import { Schema, model, Document, Types } from "mongoose";

export interface ITimetableSlot extends Document {
  _id: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  periodIndex: number;
  startTime: string; // "09:00"
  endTime: string; // "09:45"
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  room?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timetableSlotSchema = new Schema<ITimetableSlot>(
  {
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    periodIndex: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true, index: true },
    room: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

timetableSlotSchema.index(
  { academicYearId: 1, classId: 1, sectionId: 1, dayOfWeek: 1, periodIndex: 1 },
  { unique: true },
);

export const TimetableSlot = model<ITimetableSlot>("TimetableSlot", timetableSlotSchema);
