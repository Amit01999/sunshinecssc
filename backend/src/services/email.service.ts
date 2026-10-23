/**
 * No SMTP/email provider is configured for this project yet. This module is the single
 * integration point for outbound email - wire a real transport (e.g. nodemailer + SMTP,
 * SES, Resend) in here and every caller below starts working without further changes.
 * Until then, messages are logged server-side so flows remain testable end-to-end.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  console.log(`[email:stub] Password reset for ${to} -> ${resetUrl}`);
}

export async function sendAccountCreatedEmail(to: string, temporaryPassword: string): Promise<void> {
  console.log(`[email:stub] Account created for ${to} - temporary password: ${temporaryPassword}`);
}
