import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { User, hashPassword } from "../models/User.model";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../utils/tokens";
import { buildMePayload } from "../services/userProfile.service";
import { sendPasswordResetEmail } from "../services/email.service";
import { env } from "../config/env";
import { writeAuditLog } from "../models/AuditLog.model";

async function issueSession(res: Response, user: { _id: unknown; role: any; tokenVersion: number }) {
  const sub = String(user._id);
  const accessToken = signAccessToken({ sub, role: user.role, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ sub, tokenVersion: user.tokenVersion });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  return accessToken;
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated. Contact the school office.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = await issueSession(res, user);
  const me = await buildMePayload(user);
  await writeAuditLog({ actorId: user._id, actorRole: user.role, action: "auth.login", targetType: "User", targetId: user._id, ip: req.ip });

  return ok(res, { accessToken, user: me });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized("No refresh token provided");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired session, please log in again");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session no longer valid, please log in again");
  }

  const accessToken = await issueSession(res, user);
  return ok(res, { accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  if (req.user) {
    await writeAuditLog({ actorId: req.user.id, actorRole: req.user.role, action: "auth.logout", targetType: "User", targetId: req.user.id, ip: req.ip });
  }
  return ok(res, { message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound("User not found");
  return ok(res, await buildMePayload(user));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.tokenVersion += 1; // invalidate all other sessions
  await user.save();

  const accessToken = await issueSession(res, user);
  await writeAuditLog({ actorId: user._id, actorRole: user.role, action: "auth.change_password", targetType: "User", targetId: user._id, ip: req.ip });
  return ok(res, { accessToken, message: "Password changed" });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always respond the same way whether or not the account exists, to avoid leaking account existence.
  const genericResponse = { message: "If that email is registered, a password reset link has been sent." };

  if (!user || !user.isActive) {
    return ok(res, genericResponse);
  }

  const rawToken = generateRawToken();
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.frontendUrls[0]}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return ok(res, env.isProduction ? genericResponse : { ...genericResponse, devResetToken: rawToken, devResetUrl: resetUrl });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion += 1;
  await user.save();

  await writeAuditLog({ actorId: user._id, actorRole: user.role, action: "auth.reset_password", targetType: "User", targetId: user._id, ip: req.ip });
  return ok(res, { message: "Password has been reset. Please log in." });
});
