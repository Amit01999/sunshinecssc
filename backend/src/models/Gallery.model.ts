import { Schema, model, Document, Types } from "mongoose";

export interface IGalleryAlbum extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  coverImage?: { url: string; publicId: string };
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const galleryAlbumSchema = new Schema<IGalleryAlbum>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    coverImage: { url: String, publicId: String },
    isPublished: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const GalleryAlbum = model<IGalleryAlbum>("GalleryAlbum", galleryAlbumSchema);

export interface IGalleryImage extends Document {
  _id: Types.ObjectId;
  albumId?: Types.ObjectId;
  url: string;
  publicId: string;
  caption?: string;
  altText?: string;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const galleryImageSchema = new Schema<IGalleryImage>(
  {
    albumId: { type: Schema.Types.ObjectId, ref: "GalleryAlbum", index: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String },
    altText: { type: String },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const GalleryImage = model<IGalleryImage>("GalleryImage", galleryImageSchema);
