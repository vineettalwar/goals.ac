import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { discoverOpportunities } from "@workspace/content-engine/keyword-opportunity-service";
import { getDecryptedSemrushCredentialsForUser } from "@workspace/content-engine/support/org-ai-settings";
import { enqueue, QUEUES } from "@workspace/jobs";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const status = new URL(req.url).searchParams.get("status") ?? "open";

  const opportunities = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.status, status as "open" | "queued" | "dismissed"),
      ),
    )
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore));

  return NextResponse.json({ opportunities });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const asyncMode = body?.async === true;
  const refresh = body?.refresh === true;
  const source =
    body?.source === "gsc"
      ? "gsc"
      : body?.source === "ai"
        ? "ai"
        : body?.source === "semrush"
          ? "semrush"
          : "all";

  try {
    if (source === "semrush") {
      const limited = await rateLimitResponse(
        `semrush-discovery:project:${projectId}`,
        RATE_LIMITS.SEMRUSH_DISCOVERY_PER_PROJECT.limit,
        RATE_LIMITS.SEMRUSH_DISCOVERY_PER_PROJECT.windowMs,
      );
      if (limited) return limited;

      const credentials = await getDecryptedSemrushCredentialsForUser(userId!);
      if (!credentials) {
        return NextResponse.json(
          { error: "Semrush is not configured. Add your organization's API key in Settings." },
          { status: 400 },
        );
      }
    }

    if (asyncMode) {
      await enqueue(QUEUES.keywordOpportunitySweep, { projectId, userId: userId! });
      return NextResponse.json({ queued: true }, { status: 202 });
    }

    const inserted = await discoverOpportunities(projectId, userId!, {
      sources: [source],
      refresh,
    });
    return NextResponse.json({ inserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 502 },
    );
  }
}
