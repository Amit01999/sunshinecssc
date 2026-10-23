import { Schema, model, Document, Types } from "mongoose";

export interface ITeacherProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  departmentId?: Types.ObjectId;
  subjectIds: Types.ObjectId[];
  phone?: string;
  photo?: { url: string; publicId: string };
  qualification?: string;
  joinDate?: Date;
  bio?: string;
  isPublic: boolean;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const teacherProfileSchema = new Schema<ITeacherProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    designation: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    phone: { type: String },
    photo: { url: String, publicId: String },
    qualification: { type: String },
    joinDate: { type: Date },
    bio: { type: String },
    isPublic: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export const TeacherProfile = model<ITeacherProfile>("TeacherProfile", teacherProfileSchema);
