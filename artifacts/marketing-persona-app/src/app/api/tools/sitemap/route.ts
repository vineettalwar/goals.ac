import { NextResponse } from "next/server";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { checkSitemap } from "@workspace/seo-tools/freeTools";
import { z } from "zod";

const Body = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  try {
    await assertPublicUrl(parsed.data.url);
    const result = await checkSitemap(parsed.data.url);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 });
  }
}
