import { Schema, model, Document, Types } from "mongoose";

export interface IInquiryResponse {
  byUserId: Types.ObjectId;
  message: string;
  at: Date;
}

export interface IInquiry extends Document {
  _id: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toUserId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  subject: string;
  message: string;
  responses: IInquiryResponse[];
  status: "open" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const inquiryResponseSchema = new Schema<IInquiryResponse>(
  {
    byUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inquirySchema = new Schema<IInquiry>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    responses: { type: [inquiryResponseSchema], default: [] },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
  },
  { timestamps: true },
);

export const Inquiry = model<IInquiry>("Inquiry", inquirySchema);
