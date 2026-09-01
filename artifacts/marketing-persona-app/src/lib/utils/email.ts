import { resolvePlatformResendCredentials } from "@workspace/billing";
import { getPlatformSettings } from "../platform/platform-settings";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ sent: boolean }> {
  const settings = await getPlatformSettings();
  if (!settings.emailEnabled) {
    return { sent: false };
  }

  const resend = await resolvePlatformResendCredentials();
  if (!resend?.apiKey) {
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resend.fromEmail,
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

export function buildFirmInviteEmail(input: {
  inviteUrl: string;
  contactName?: string | null;
  orgName?: string | null;
  inviterName: string;
}): { subject: string; html: string } {
  const { inviteUrl, contactName, orgName, inviterName } = input;
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : "Hi there,";
  const firmMention = orgName?.trim() ? ` for ${orgName.trim()}` : "";

  return {
    subject: "Setting up your goals.ac account",
    html: `
      <p>${greeting}</p>
      <p>${inviterName} set up an invite for you on goals.ac${firmMention}. We built the platform
      to take the brand scraping, keyword research, and first-draft writing off your plate, so
      your team can spend its time on the articles that actually need a human eye.</p>
      <p>Click below to create your account. It walks you through a few quick questions about
      your firm, your voice, and where you want content published, and by the end you'll have
      a first article already being written from your own material.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>Takes most people under five minutes. If anything looks off or you'd rather talk it
      through first, just reply to this email.</p>
      <p>This link expires in 7 days and only works once.</p>
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
