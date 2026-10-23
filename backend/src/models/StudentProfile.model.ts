import { Schema, model, Document, Types } from "mongoose";

export interface IStudentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  studentCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  photo?: { url: string; publicId: string };
  address?: string;
  phone?: string;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  rollNumber?: string;
  academicYearId?: Types.ObjectId;
  admissionDate?: Date;
  guardianInfo?: {
    fatherName?: string;
    motherName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
  };
  status: "active" | "inactive" | "graduated" | "transferred";
  createdAt: Date;
  updatedAt: Date;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    studentCode: { type: String, required: true, unique: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodGroup: { type: String },
    photo: { url: String, publicId: String },
    address: { type: String },
    phone: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", index: true },
    rollNumber: { type: String },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear" },
    admissionDate: { type: Date },
    guardianInfo: {
      fatherName: String,
      motherName: String,
      guardianPhone: String,
      guardianEmail: String,
    },
    status: { type: String, enum: ["active", "inactive", "graduated", "transferred"], default: "active", index: true },
  },
  { timestamps: true },
);

studentProfileSchema.index({ classId: 1, sectionId: 1, status: 1 });
studentProfileSchema.index({ firstName: "text", lastName: "text", studentCode: "text" });

export const StudentProfile = model<IStudentProfile>("StudentProfile", studentProfileSchema);
