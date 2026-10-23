import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { Role } from "./roles";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn as any });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn as any });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export const REFRESH_COOKIE_NAME = "sc_refresh_token";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // The frontend and this API are deployed as separate origins (e.g. two Vercel projects), so
    // the browser treats every API call as cross-site - "strict"/"lax" would simply never send
    // this cookie back, silently breaking /auth/refresh. "None" requires Secure, which production
    // already sets above. (If this API is ever served from the same site as the frontend, "lax"
    // would be the safer choice again.)
    sameSite: (env.isProduction ? "none" : "lax") as "strict" | "lax" | "none",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
