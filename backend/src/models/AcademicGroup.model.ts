import { Schema, model, Document, Types } from "mongoose";

/** An academic stream (e.g. Science, Humanities, Business Studies) used to scope
 *  which classes a group-specific subject applies to - mainly for higher-secondary levels. */
export interface IAcademicGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  classIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const academicGroupSchema = new Schema<IAcademicGroup>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    classIds: [{ type: Schema.Types.ObjectId, ref: "SchoolClass" }],
  },
  { timestamps: true },
);

export const AcademicGroup = model<IAcademicGroup>("AcademicGroup", academicGroupSchema);
