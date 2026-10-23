import { Schema, model, Document, Types } from "mongoose";

export interface IStudentParentLink extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  parentId: Types.ObjectId;
  relationship: "father" | "mother" | "guardian";
  isPrimary: boolean;
  verifiedBy: Types.ObjectId;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentParentLinkSchema = new Schema<IStudentParentLink>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    relationship: { type: String, enum: ["father", "mother", "guardian"], required: true },
    isPrimary: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

studentParentLinkSchema.index({ studentId: 1, parentId: 1 }, { unique: true });

export const StudentParentLink = model<IStudentParentLink>("StudentParentLink", studentParentLinkSchema);
