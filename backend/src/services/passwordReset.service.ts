import { IUser, hashPassword } from "../models/User.model";
import { generateTemporaryPassword } from "../utils/generatePassword";
import { sendAccountCreatedEmail } from "./email.service";
import { writeAuditLog } from "../models/AuditLog.model";

/** Generates a new temporary password for a user, hashes and saves it, bumps tokenVersion
 *  (signing out any existing sessions), emails it, and audit-logs the action. Shared by the
 *  admin and teacher "reset password" endpoints so an account whose one-time password was
 *  lost before first login can always be given a fresh one. */
export async function resetUserPasswordAndNotify(
  user: IUser,
  actorId: string,
  actorRole: string,
  ip?: string,
): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.tokenVersion += 1;
  await user.save();
  await sendAccountCreatedEmail(user.email, temporaryPassword);

  await writeAuditLog({
    actorId,
    actorRole,
    action: "user.reset_password",
    targetType: "User",
    targetId: user._id,
    ip,
  });

  return temporaryPassword;
}
