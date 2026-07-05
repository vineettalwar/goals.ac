import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimitResponse(
    `auth-forgot-password:${ip}`,
    RATE_LIMITS.AUTH_PER_IP.limit,
    RATE_LIMITS.AUTH_PER_IP.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const { email } = parsed.data;

  // Always return 200 to prevent email enumeration
  try {
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await db
        .update(usersTable)
        .set({ passwordResetToken: token, passwordResetExpires: expires })
        .where(eq(usersTable.id, user.id));

      // Send email if Resend is configured
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@goals.ac";
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

      if (resendKey) {
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: "Reset your goals.ac password",
            html: `
              <p>Hi ${user.name},</p>
              <p>You requested a password reset. Click the link below to choose a new password:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p>This link expires in 1 hour.</p>
              <p>If you didn't request this, ignore this email — your password won't change.</p>
            `,
          }),
        });
      }
    }
  } catch {
    // Swallow errors — always respond 200
  }

  return NextResponse.json({ ok: true });
}
