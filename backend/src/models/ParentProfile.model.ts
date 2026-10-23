import { Schema, model, Document, Types } from "mongoose";

export interface IParentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone?: string;
  occupation?: string;
  photo?: { url: string; publicId: string };
  createdAt: Date;
  updatedAt: Date;
}

const parentProfileSchema = new Schema<IParentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String },
    occupation: { type: String },
    photo: { url: String, publicId: String },
  },
  { timestamps: true },
);

export const ParentProfile = model<IParentProfile>("ParentProfile", parentProfileSchema);
