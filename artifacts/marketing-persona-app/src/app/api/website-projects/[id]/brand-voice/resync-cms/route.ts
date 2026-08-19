import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { loadCmsContentForBrandVoice } from "@workspace/content-engine/support/brand/brand-scan-context";
import { ingestBrandVoiceDocuments } from "@workspace/content-engine/brand/brand-voice-indexer";

const DEFAULT_LIMIT = 5;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const docs = await loadCmsContentForBrandVoice(projectId);
  if (docs.length === 0) {
    return NextResponse.json(
      {
        error: "no_cms_posts",
        message:
          "No CMS posts found. Connect the WordPress plugin (HMAC) and confirm GET /site-graph returns published posts.",
      },
      { status: 422 },
    );
  }

  const limit = DEFAULT_LIMIT;
  const trimmed = docs.slice(0, limit);
  const sourceIds = await ingestBrandVoiceDocuments(projectId, trimmed);

  return NextResponse.json({
    ok: true,
    ingested: trimmed.length,
    totalAvailable: docs.length,
    sourceIds,
  });
}
