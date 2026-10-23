import { Schema, model, Document, Types } from "mongoose";

export interface IProfileChangeRequest extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  requestedChanges: Record<string, unknown>;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileChangeRequestSchema = new Schema<IProfileChangeRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedChanges: { type: Schema.Types.Mixed, required: true },
    reason: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true },
);

export const ProfileChangeRequest = model<IProfileChangeRequest>("ProfileChangeRequest", profileChangeRequestSchema);
