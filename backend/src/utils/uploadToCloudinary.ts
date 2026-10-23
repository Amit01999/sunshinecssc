import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary";
import { ApiError } from "./ApiError";

export interface UploadedAsset {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  resourceType: string;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20MB

export function assertValidUpload(file: { mimetype: string; size: number }, kind: "image" | "document") {
  const allowed = kind === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (!allowed.includes(file.mimetype)) {
    throw ApiError.badRequest(`Unsupported file type: ${file.mimetype}`);
  }
  if (file.size > maxBytes) {
    throw ApiError.badRequest(`File too large. Max size is ${Math.round(maxBytes / (1024 * 1024))}MB`);
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; resourceType?: "image" | "raw" | "auto" },
): Promise<UploadedAsset> {
  if (!isCloudinaryConfigured) {
    throw ApiError.internal(
      "File uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `sunshinecssc/${options.folder}`,
        resource_type: options.resourceType ?? "auto",
      },
      (error, result) => {
        if (error || !result) {
          return reject(ApiError.internal(error?.message ?? "Cloudinary upload failed"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

export async function destroyAsset(publicId: string, resourceType: "image" | "raw" = "image"): Promise<void> {
  if (!isCloudinaryConfigured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`[cloudinary] failed to destroy asset ${publicId}:`, (err as Error).message);
  }
}
