/**
 * One-time bootstrap for the very first Super Admin account.
 * No admin account is ever created automatically on server boot - this script must be
 * run deliberately, with credentials supplied via environment variables (or a local
 * .env), so no installation ever ships with a public/default admin login.
 *
 * Usage:
 *   INITIAL_ADMIN_EMAIL=you@school.com INITIAL_ADMIN_PASSWORD=... INITIAL_ADMIN_NAME="Jane Doe" npm run seed:admin
 * or set those same keys in backend/.env and just run: npm run seed:admin
 */
import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { User, hashPassword } from "../models/User.model";
import { StaffProfile } from "../models/StaffProfile.model";
import { ROLES } from "../utils/roles";

async function run() {
  const { email, password, name } = env.initialAdmin;

  if (!email || !password || !name) {
    console.error(
      "Missing INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD or INITIAL_ADMIN_NAME.\n" +
        "Set them in backend/.env (see .env.example) and re-run: npm run seed:admin",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}). Aborting.`);
    await disconnectDB();
    process.exit(1);
  }

  const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existingSuperAdmin) {
    console.warn(
      `A super_admin already exists (${existingSuperAdmin.email}). Creating another one as requested.`,
    );
  }

  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest.join(" ") || firstName;

  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    role: ROLES.SUPER_ADMIN,
    isActive: true,
    mustChangePassword: true,
  });

  await StaffProfile.create({
    userId: user._id,
    employeeId: `SA-${Date.now().toString(36).toUpperCase()}`,
    firstName,
    lastName,
    designation: "Super Administrator",
    status: "active",
  });

  console.log(`Super admin created: ${user.email}. They will be required to change their password on first login.`);
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed to seed super admin:", err);
  process.exit(1);
});
