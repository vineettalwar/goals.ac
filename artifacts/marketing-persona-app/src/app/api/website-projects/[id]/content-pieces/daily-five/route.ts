import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { GenerateBody } from "@/lib/content/content-pieces-helpers";

const DailyFiveBody = z.object({
  items: z.array(GenerateBody).min(1).max(5),
  sequential: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DailyFiveBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";
  const created: unknown[] = [];
  const failures: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < parsed.data.items.length; i += 1) {
    const item = parsed.data.items[i];
    const res = await fetch(`${baseUrl}/api/website-projects/${projectId}/content-pieces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      failures.push({ index: i, error: data?.error ?? "Generation failed" });
      continue;
    }
    created.push(await res.json());
  }

  return NextResponse.json({
    ok: failures.length === 0,
    created,
    failures,
  });
}
