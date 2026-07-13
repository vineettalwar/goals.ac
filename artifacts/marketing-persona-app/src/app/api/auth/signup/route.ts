import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { acceptOrgInvite } from "@/lib/org-access";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  referrer: z.string().max(100).optional(),
  inviteToken: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = await rateLimitResponse(
    `auth-signup:${ip}`,
    RATE_LIMITS.AUTH_PER_IP.limit,
    RATE_LIMITS.AUTH_PER_IP.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, password, referrer, inviteToken } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, signupReferrer: referrer ?? null })
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name });

  let organizationId: number | null = null;
  if (inviteToken) {
    const acceptResult = await acceptOrgInvite({ token: inviteToken, userId: user.id });
    if (acceptResult.ok) {
      organizationId = acceptResult.organizationId;
    }
  }

  return NextResponse.json({ user, organizationId }, { status: 201 });
}
