import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/tokens";
import { User } from "../models/User.model";
import { Role } from "../utils/roles";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  tokenVersion: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return undefined;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthorized("Missing access token");
    }
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired access token");
    }

    const user = await User.findById(payload.sub).select("role isActive tokenVersion");
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account not found or deactivated");
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized("Session has been invalidated, please log in again");
    }

    req.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

/** Best-effort auth: attaches req.user if a valid token is present, never rejects. Used by public endpoints that vary by role (e.g. preview). */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("role isActive tokenVersion");
    if (user && user.isActive && user.tokenVersion === payload.tokenVersion) {
      req.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
