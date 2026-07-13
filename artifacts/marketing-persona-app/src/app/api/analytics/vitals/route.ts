import { NextResponse } from "next/server";
import { z } from "zod";

const vitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.string().optional(),
  navigationType: z.string().optional(),
  path: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = vitalsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Lightweight RUM sink — extend with analytics provider as needed
  if (process.env.NODE_ENV === "development") {
    console.info("[web-vitals]", parsed.data);
  }

  return NextResponse.json({ ok: true });
}
