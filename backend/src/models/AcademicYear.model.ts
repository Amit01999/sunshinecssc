import { Schema, model, Document, Types } from "mongoose";

export interface IAcademicYear extends Document {
  _id: Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AcademicYear = model<IAcademicYear>("AcademicYear", academicYearSchema);
