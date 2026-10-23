import { Schema, model, Document, Types } from "mongoose";

export interface IHeroSlide {
  imageUrl: string;
  imagePublicId: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  overlayOpacity: number;
  focalPosition: string; // CSS object-position, e.g. "center" | "top" | "50% 30%"
  order: number;
}

export interface IMessageCard {
  title: string;
  name: string;
  role: string;
  text: string;
  link: string;
  color: string;
  imageUrl?: string;
  imagePublicId?: string;
  order: number;
}

export interface IMessagesSection {
  sectionTitle: string;
  cards: IMessageCard[];
}

export interface IHomepageContent {
  heroSlides: IHeroSlide[];
  messagesSection: IMessagesSection;
}

export interface IHomepageSettings extends Document {
  _id: Types.ObjectId;
  published: IHomepageContent;
  draft: IHomepageContent;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const heroSlideSchema = new Schema<IHeroSlide>(
  {
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
    mobileImageUrl: { type: String },
    mobileImagePublicId: { type: String },
    heading: { type: String },
    subheading: { type: String },
    ctaLabel: { type: String },
    ctaHref: { type: String },
    overlayOpacity: { type: Number, default: 0.1, min: 0, max: 1 },
    focalPosition: { type: String, default: "center" },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const messageCardSchema = new Schema<IMessageCard>(
  {
    title: { type: String, default: "" },
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    text: { type: String, default: "" },
    link: { type: String, default: "" },
    color: { type: String, default: "#3C76A6" },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const messagesSectionSchema = new Schema<IMessagesSection>(
  {
    sectionTitle: { type: String, default: "Messages from Our Leadership" },
    cards: { type: [messageCardSchema], default: [] },
  },
  { _id: false },
);

const homepageContentSchema = new Schema<IHomepageContent>(
  {
    heroSlides: { type: [heroSlideSchema], default: [] },
    messagesSection: { type: messagesSectionSchema, default: () => ({ sectionTitle: "Messages from Our Leadership", cards: [] }) },
  },
  { _id: false },
);

const homepageSettingsSchema = new Schema<IHomepageSettings>(
  {
    published: { type: homepageContentSchema, default: () => ({ heroSlides: [] }) },
    draft: { type: homepageContentSchema, default: () => ({ heroSlides: [] }) },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const HomepageSettings = model<IHomepageSettings>("HomepageSettings", homepageSettingsSchema);
