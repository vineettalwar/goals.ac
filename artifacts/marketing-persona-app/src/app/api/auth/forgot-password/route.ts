import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { buildPasswordResetEmail, sendEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = await rateLimitResponse(
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

      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      const emailContent = buildPasswordResetEmail({ resetUrl, userName: user.name });
      try {
        await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch {
        // Swallow email errors — still respond 200
      }
    }
  } catch {
    // Swallow errors — always respond 200
  }

  return NextResponse.json({ ok: true });
}
