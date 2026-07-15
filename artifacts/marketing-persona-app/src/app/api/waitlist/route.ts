import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { waitlistSignupsTable } from "@workspace/db/schema";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  featureKey: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and feature required" }, { status: 400 });
  }

  try {
    await db.insert(waitlistSignupsTable).values({
      email: parsed.data.email.toLowerCase(),
      featureKey: parsed.data.featureKey,
    });
  } catch (err) {
    // ignore duplicate email+feature
    if (err instanceof Error && !err.message.includes("unique")) {
      return NextResponse.json({ error: "Could not save signup" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
