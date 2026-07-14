import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { runBrandScrapeWithDiscovery } from "@workspace/content-engine/support/brand-scrape-orchestrator";

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

    runBrandScrapeWithDiscovery(id, project.url, {
      overwrite: true,
      refreshSitemap: true,
    }).catch(() => {});

    return NextResponse.json({ message: "Scrape started", scrapeStatus: "pending" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
