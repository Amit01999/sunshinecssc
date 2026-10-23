import { Schema, model, Document, Types } from "mongoose";

export interface INewsArticle extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  summary?: string;
  body: string;
  featuredImage?: { url: string; publicId: string };
  category?: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt?: Date;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const newsArticleSchema = new Schema<INewsArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    summary: { type: String },
    body: { type: String, required: true },
    featuredImage: { url: String, publicId: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

newsArticleSchema.index({ status: 1, publishedAt: -1 });

export const NewsArticle = model<INewsArticle>("NewsArticle", newsArticleSchema);
