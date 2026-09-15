import { eq } from "drizzle-orm";
import {
  contentPiecesTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  assertProjectInOrg,
  requireApiKeyScope,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { kvPutJson } from "@workspace/cf-edge/kv-cache";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { withCors } from "@workspace/cf-edge/cors";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { db, withPublicApiKey } from "./http";

export async function handleV1GenerateWithAgents(
  request: Request,
  path: string,
  env?: CfEdgeBindings,
): Promise<Response | null> {
  if (path !== "/api/v1/content-pieces/generate-with-agents" || request.method !== "POST") {
    return null;
  }

  return withPublicApiKey(request, async (key) => {
    requireApiKeyScope(key, "content:generate");
    const body = (await request.json().catch(() => null)) as {
      projectId?: number;
      formatType?: ContentFormatType;
      targetKeyword?: string;
      angleHint?: string;
      fastMode?: boolean;
      stream?: boolean;
    } | null;

    if (!body?.projectId || !body.formatType || !body.targetKeyword?.trim()) {
      return Response.json(
        { error: "projectId, formatType, and targetKeyword are required" },
        { status: 400 },
      );
    }
    if (body.stream) {
      return Response.json(
        {
          error: "SSE streaming is not available on the public API. Omit stream to queue agent generation.",
          code: "EDGE_ROUTE_NOT_IMPLEMENTED",
        },
        { status: 501 },
      );
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const billingUserId = await resolveOrgBillingUserId(key.organizationId);
    if (!billingUserId) {
      return Response.json({ error: "Organization has no billing owner" }, { status: 500 });
    }

    const [piece] = await db()
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: body.projectId,
        formatType: body.formatType,
        title: body.targetKeyword.trim(),
        targetKeyword: body.targetKeyword.trim(),
        bodyMarkdown: "",
        wordCount: 0,
        status: "generating",
        pieceMetadata: body.angleHint ? { contentAngle: body.angleHint } : null,
      })
      .returning();
    if (!piece) {
      return Response.json({ error: "Failed to create draft" }, { status: 500 });
    }

    const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
      contentPieceId: piece.id,
      projectId: body.projectId,
      userId: billingUserId,
      useAgentTeam: true,
      ...(body.fastMode ? { agentFastMode: true } : {}),
    });
    const id = jobId ?? `cf:${QUEUES.contentGenerate}:${crypto.randomUUID()}`;
    await kvPutJson(
      env?.AI_CACHE,
      `job:status:${id}`,
      {
        jobId: id,
        queue: QUEUES.contentGenerate,
        status: "queued",
        userId: billingUserId,
        projectId: body.projectId,
        contentPieceId: piece.id,
        updatedAt: new Date().toISOString(),
      },
      86_400,
    );

    return withCors(
      request,
      acceptedJobResponse(id, QUEUES.contentGenerate, {
        contentPieceId: piece.id,
        message: "Agent team generation queued. Poll the content piece until bodyMarkdown is filled.",
      }),
    );
  });
}
