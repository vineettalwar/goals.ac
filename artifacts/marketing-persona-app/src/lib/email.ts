export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ sent: boolean }> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@goals.ac";

  if (!resendKey) {
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send email: ${res.status}`);
  }

  return { sent: true };
}

export function buildOrgInviteEmail(input: {
  inviteUrl: string;
  orgName: string;
  inviterName: string;
}): { subject: string; html: string } {
  const { inviteUrl, orgName, inviterName } = input;
  return {
    subject: `You've been invited to join ${orgName} on goals.ac`,
    html: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong> on goals.ac.</p>
      <p>Click the link below to accept your invitation:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This invitation expires in 7 days.</p>
      <p>If you weren't expecting this, you can ignore this email.</p>
    `,
  };
}

export function buildPasswordResetEmail(input: {
  resetUrl: string;
  userName: string;
}): { subject: string; html: string } {
  const { resetUrl, userName } = input;
  return {
    subject: "Reset your goals.ac password",
    html: `
      <p>Hi ${userName},</p>
      <p>You requested a password reset. Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email — your password won't change.</p>
    `,
  };
}
