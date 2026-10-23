import { Schema, model, Document, Types } from "mongoose";

export interface ISection extends Document {
  _id: Types.ObjectId;
  name: string;
  classId: Types.ObjectId;
  capacity?: number;
  groupId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    name: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    capacity: { type: Number },
    // Optional label for which academic stream this section follows (e.g. Class XI Section A = Science).
    groupId: { type: Schema.Types.ObjectId, ref: "AcademicGroup" },
  },
  { timestamps: true },
);

sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

export const Section = model<ISection>("Section", sectionSchema);
