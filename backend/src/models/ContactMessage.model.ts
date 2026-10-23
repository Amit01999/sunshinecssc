import { Schema, model, Document, Types } from "mongoose";

export interface IContactMessage extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const ContactMessage = model<IContactMessage>("ContactMessage", contactMessageSchema);
