import { Schema, model, Document, Types } from "mongoose";

export interface IStaffProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  department?: string;
  phone?: string;
  photo?: { url: string; publicId: string };
  joinDate?: Date;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const staffProfileSchema = new Schema<IStaffProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    designation: { type: String },
    department: { type: String },
    phone: { type: String },
    photo: { url: String, publicId: String },
    joinDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export const StaffProfile = model<IStaffProfile>("StaffProfile", staffProfileSchema);
