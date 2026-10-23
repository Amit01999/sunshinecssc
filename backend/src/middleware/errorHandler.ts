import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid identifier: ${err.value}` });
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === 11000) {
    return res.status(409).json({ success: false, message: "A record with this value already exists" });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }

  console.error("[unhandled error]", err);
  return res.status(500).json({
    success: false,
    message: "Something went wrong on our end. Please try again later.",
    stack: env.isProduction ? undefined : (err as Error)?.stack,
  });
}
