import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { GoalsD1Database } from "@workspace/db/d1";
import { usersTable } from "@workspace/db/schema-sqlite";

const forgotBody = z.object({ email: z.string().email() });

const resetBody = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type PasswordResetEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
};

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveAppUrl(env: PasswordResetEnv, request: Request): string {
  const configured = env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5174";
  }
  return "https://app.goals.ac";
}

function buildPasswordResetEmail(input: { resetUrl: string; userName: string }): {
  subject: string;
  html: string;
} {
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

async function sendPasswordResetEmail(
  env: PasswordResetEnv,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from = env.RESEND_FROM_EMAIL?.trim() || "noreply@goals.ac";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  return res.ok;
}

export async function handleAuthForgotPassword(
  request: Request,
  env: PasswordResetEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const parsed = forgotBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  let devResetUrl: string | undefined;

  try {
    const [user] = await database
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user) {
      const token = randomToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60);

      await database
        .update(usersTable)
        .set({ passwordResetToken: token, passwordResetExpires: expires })
        .where(eq(usersTable.id, user.id));

      const resetUrl = `${resolveAppUrl(env, request)}/reset-password?token=${token}`;
      const emailContent = buildPasswordResetEmail({ resetUrl, userName: user.name });

      const sent = await sendPasswordResetEmail(
        env,
        email,
        emailContent.subject,
        emailContent.html,
      ).catch(() => false);

      if (!sent) {
        devResetUrl = resetUrl;
      }
    }
  } catch {
    // Swallow errors — always respond 200 to prevent email enumeration.
  }

  if (devResetUrl) {
    return Response.json({ ok: true, devResetUrl });
  }
  return Response.json({ ok: true });
}

export async function handleAuthResetPassword(
  request: Request,
  database: GoalsD1Database,
): Promise<Response> {
  const parsed = resetBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }

  const { token, password } = parsed.data;

  try {
    const [user] = await database
      .select({
        id: usersTable.id,
        passwordResetToken: usersTable.passwordResetToken,
        passwordResetExpires: usersTable.passwordResetExpires,
      })
      .from(usersTable)
      .where(eq(usersTable.passwordResetToken, token))
      .limit(1);

    if (!user) {
      return Response.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return Response.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await database
      .update(usersTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
      .where(eq(usersTable.id, user.id));

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
