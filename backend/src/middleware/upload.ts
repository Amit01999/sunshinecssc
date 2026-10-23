import multer from "multer";

// Buffered in memory, then streamed to Cloudinary - nothing is ever written to local disk.
const storage = multer.memoryStorage();

export const uploadSingle = (fieldName: string) =>
  multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }).single(fieldName);

export const uploadMultiple = (fieldName: string, maxCount = 10) =>
  multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }).array(fieldName, maxCount);
