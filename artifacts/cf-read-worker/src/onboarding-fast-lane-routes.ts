import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema-sqlite";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";
import { loadProjectVisibilitySummary } from "./visibility-routes";

export async function handleOnboardingFastLaneRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/onboarding/fast-lane" || request.method !== "GET") {
    return null;
  }

  const projectId = Number(new URL(request.url).searchParams.get("projectId"));
  if (!projectId || Number.isNaN(projectId)) {
    return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
  }

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const pieceStats = await db
    .select({
      status: contentPiecesTable.status,
      value: count(),
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .groupBy(contentPiecesTable.status);

  const byStatus = Object.fromEntries(pieceStats.map((r) => [r.status, r.value]));
  const visibility = await loadProjectVisibilitySummary(projectId);

  const [firstPiece] = await db
    .select({ id: contentPiecesTable.id })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        inArray(contentPiecesTable.status, ["draft", "ready", "published"]),
      ),
    )
    .orderBy(asc(contentPiecesTable.id))
    .limit(1);

  return withCors(
    request,
    Response.json({
      crawlStatus: project.crawlStatus,
      scrapeStatus: project.scrapeStatus ?? null,
      projectId: project.id,
      url: project.url,
      articleProgress: {
        generating: byStatus.generating ?? 0,
        draft: byStatus.draft ?? 0,
        ready: byStatus.ready ?? 0,
        published: byStatus.published ?? 0,
        failed: byStatus.failed ?? 0,
      },
      firstPieceId: firstPiece?.id ?? null,
      visibility: {
        visibilityScore: visibility.visibilityScore,
        visibilityDelta: visibility.visibilityDelta,
        latestGeoScore: visibility.latestGeoScore,
        geoScoreDelta: visibility.geoScoreDelta,
      },
    }),
  );
}
