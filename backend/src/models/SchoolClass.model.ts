import { Schema, model, Document, Types } from "mongoose";

export interface ISchoolClass extends Document {
  _id: Types.ObjectId;
  name: string;
  academicYearId: Types.ObjectId;
  classTeacherId?: Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const schoolClassSchema = new Schema<ISchoolClass>(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: "TeacherProfile" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

schoolClassSchema.index({ academicYearId: 1, name: 1 }, { unique: true });

export const SchoolClass = model<ISchoolClass>("SchoolClass", schoolClassSchema);
