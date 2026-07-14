import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { persistSitemapCrawl } from "@workspace/content-engine/support/brand/brand-scan-context";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  try {
    const project = await getAccessibleProject(id, userId!);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const result = await persistSitemapCrawl(id, project.url);
    return NextResponse.json({
      sitemapUrl: result.sitemapUrl,
      pageCount: result.pageCount,
      crawlStatus: "done",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sitemap crawl failed" },
      { status: 502 },
    );
  }
}
