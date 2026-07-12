import { NextResponse } from "next/server";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { scoreMetaTags } from "@workspace/seo-tools/freeTools";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { z } from "zod";

const Body = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  try {
    await assertPublicUrl(parsed.data.url);
    const audit = await auditUrl(parsed.data.url);
    const meta = scoreMetaTags(audit.pageTitle, audit.metaDescription);
    return NextResponse.json({
      url: parsed.data.url,
      ...meta,
      pageTitle: audit.pageTitle,
      metaDescription: audit.metaDescription,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 });
  }
}
