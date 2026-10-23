import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { HomepageSettings, IMessageCard } from "../models/HomepageSettings.model";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

async function getOrCreateSettings() {
  let settings = await HomepageSettings.findOne();
  if (!settings) settings = await HomepageSettings.create({});
  return settings;
}

const DEFAULT_CARD_META = [
  { link: "/message/founder", color: "#9C8ED7" },
  { link: "/message/director", color: "#3C76A6" },
  { link: "/message/headmaster", color: "#EBBA79" },
];
const MESSAGE_CARD_COUNT = DEFAULT_CARD_META.length;

function ensureMessageCard(cards: IMessageCard[], index: number): IMessageCard {
  while (cards.length <= index) {
    const meta = DEFAULT_CARD_META[cards.length] ?? { link: "", color: "#3C76A6" };
    cards.push({ title: "", name: "", role: "", text: "", link: meta.link, color: meta.color, order: cards.length });
  }
  return cards[index];
}

export const publicGet = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  return ok(res, settings.published);
});

export const adminGet = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  return ok(res, { draft: settings.draft, published: settings.published, updatedAt: settings.updatedAt });
});

export const addSlide = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest("No hero image provided");
  assertValidUpload(file, "image");

  const settings = await getOrCreateSettings();
  const asset = await uploadBuffer(file.buffer, { folder: "homepage-hero", resourceType: "image" });

  settings.draft.heroSlides.push({
    imageUrl: asset.url,
    imagePublicId: asset.publicId,
    heading: req.body.heading,
    subheading: req.body.subheading,
    ctaLabel: req.body.ctaLabel,
    ctaHref: req.body.ctaHref,
    overlayOpacity: req.body.overlayOpacity !== undefined ? Number(req.body.overlayOpacity) : 0.1,
    focalPosition: req.body.focalPosition ?? "center",
    order: settings.draft.heroSlides.length,
  });
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const updateSlide = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  const slide = settings.draft.heroSlides[index];
  if (!slide) throw ApiError.notFound("Slide not found");

  Object.assign(slide, req.body);
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const replaceSlideImage = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  const slide = settings.draft.heroSlides[index];
  if (!slide) throw ApiError.notFound("Slide not found");

  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");
  const asset = await uploadBuffer(file.buffer, { folder: "homepage-hero", resourceType: "image" });

  const oldPublicId = req.body.target === "mobile" ? slide.mobileImagePublicId : slide.imagePublicId;
  if (oldPublicId) await destroyAsset(oldPublicId);

  if (req.body.target === "mobile") {
    slide.mobileImageUrl = asset.url;
    slide.mobileImagePublicId = asset.publicId;
  } else {
    slide.imageUrl = asset.url;
    slide.imagePublicId = asset.publicId;
  }
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const removeSlide = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  const slide = settings.draft.heroSlides[index];
  if (!slide) throw ApiError.notFound("Slide not found");

  if (slide.imagePublicId) await destroyAsset(slide.imagePublicId);
  if (slide.mobileImagePublicId) await destroyAsset(slide.mobileImagePublicId);
  settings.draft.heroSlides.splice(index, 1);
  settings.draft.heroSlides.forEach((s, i) => (s.order = i));
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const reorderSlides = asyncHandler(async (req: Request, res: Response) => {
  const { order } = req.body as { order: number[] };
  const settings = await getOrCreateSettings();
  if (order.length !== settings.draft.heroSlides.length) {
    throw ApiError.badRequest("Order array must reference every existing slide");
  }
  settings.draft.heroSlides = order.map((originalIndex, newIndex) => {
    const slide = settings.draft.heroSlides[originalIndex];
    slide.order = newIndex;
    return slide;
  });
  await settings.save();
  return ok(res, settings.draft);
});

export const updateMessagesSectionTitle = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  settings.draft.messagesSection.sectionTitle = req.body.sectionTitle;
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const updateMessageCard = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= MESSAGE_CARD_COUNT) {
    throw ApiError.badRequest("Invalid card index");
  }
  const card = ensureMessageCard(settings.draft.messagesSection.cards, index);
  Object.assign(card, req.body);
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const replaceMessageCardImage = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= MESSAGE_CARD_COUNT) {
    throw ApiError.badRequest("Invalid card index");
  }
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");
  const asset = await uploadBuffer(file.buffer, { folder: "messages", resourceType: "image" });

  const card = ensureMessageCard(settings.draft.messagesSection.cards, index);
  if (card.imagePublicId) await destroyAsset(card.imagePublicId);
  card.imageUrl = asset.url;
  card.imagePublicId = asset.publicId;
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const removeMessageCardImage = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  const index = Number(req.params.index);
  const card = settings.draft.messagesSection.cards[index];
  if (!card) throw ApiError.notFound("Card not found");
  if (card.imagePublicId) await destroyAsset(card.imagePublicId);
  card.imageUrl = undefined;
  card.imagePublicId = undefined;
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.draft);
});

export const publishDraft = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  settings.published = JSON.parse(JSON.stringify(settings.draft));
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings.published);
});

export const discardDraft = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  settings.draft = JSON.parse(JSON.stringify(settings.published));
  await settings.save();
  return ok(res, settings.draft);
});
