import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import {
  encryptStoredTokens,
  listGa4PropertiesForConnection,
  parseStoredTokens,
  resolveAccessToken,
  type AnalyticsPropertyTokenEnv,
} from "@workspace/cf-edge/analytics-property-client";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { googleEnvBindings } from "@workspace/platform-admin";
import { db } from "./db";
import {
  ANALYTICS_PROPERTY_PROVIDERS,
  analyticsPropertyConnectionsTable,
  type AnalyticsPropertyProvider,
} from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";

const selectPropertyBody = z.object({
  propertyId: z.string().min(1),
  streamId: z.string().optional(),
});

export async function handleAnalyticsPropertiesWrite(
  request: Request,
  path: string,
  userId: number,
  env: AnalyticsPropertyTokenEnv,
  trackJob?: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  const ga4Match = path.match(/^\/api\/website-projects\/(\d+)\/analytics-properties\/ga4\/sync$/);
  if (ga4Match && request.method === "POST") {
    const projectId = Number.parseInt(ga4Match[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const jobId = await sendToCfQueue(QUEUES.ga4AnalyticsSync, { projectId, userId });
    const id = jobId ?? `cf:${QUEUES.ga4AnalyticsSync}:${Date.now()}`;
    if (trackJob) {
      await trackJob(id, QUEUES.ga4AnalyticsSync, { userId, projectId });
    }
    return withCors(request, acceptedJobResponse(id, QUEUES.ga4AnalyticsSync));
  }

  const baseMatch = path.match(/^\/api\/website-projects\/(\d+)\/analytics-properties$/);
  if (!baseMatch) return null;

  const projectId = Number.parseInt(baseMatch[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  if (request.method === "DELETE") {
    const provider = new URL(request.url).searchParams.get("provider") as AnalyticsPropertyProvider | null;
    if (!provider || !ANALYTICS_PROPERTY_PROVIDERS.includes(provider)) {
      return withCors(
        request,
        Response.json({ error: "provider query param is required" }, { status: 400 }),
      );
    }

    await db
      .delete(analyticsPropertyConnectionsTable)
      .where(
        and(
          eq(analyticsPropertyConnectionsTable.projectId, projectId),
          eq(analyticsPropertyConnectionsTable.provider, provider),
        ),
      );

    return withCors(request, Response.json({ ok: true }));
  }

  if (request.method === "PATCH") {
    const parsed = selectPropertyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }

    const [connection] = await db
      .select({
        id: analyticsPropertyConnectionsTable.id,
        encryptedTokens: analyticsPropertyConnectionsTable.encryptedTokens,
      })
      .from(analyticsPropertyConnectionsTable)
      .where(
        and(
          eq(analyticsPropertyConnectionsTable.projectId, projectId),
          eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
        ),
      )
      .limit(1);

    if (!connection) {
      return withCors(
        request,
        Response.json({ error: "Connect Google Analytics first" }, { status: 404 }),
      );
    }

    try {
      let tokens = parseStoredTokens(connection.encryptedTokens);
      const resolved = await resolveAccessToken(tokens, await googleEnvBindings(env));
      tokens = resolved.tokens;

      if (resolved.refreshed) {
        await db
          .update(analyticsPropertyConnectionsTable)
          .set({ encryptedTokens: encryptStoredTokens(tokens) })
          .where(eq(analyticsPropertyConnectionsTable.id, connection.id));
      }

      const available = await listGa4PropertiesForConnection(resolved.accessToken);
      const selected = available.find((property) => property.propertyId === parsed.data.propertyId);
      if (!selected) {
        return withCors(
          request,
          Response.json({ error: "Property is not in your verified account" }, { status: 400 }),
        );
      }

      await db
        .update(analyticsPropertyConnectionsTable)
        .set({
          propertyId: selected.propertyId,
          propertyName: selected.propertyName,
          streamId: parsed.data.streamId ?? selected.streamId,
          propertyVerified: true,
        })
        .where(eq(analyticsPropertyConnectionsTable.id, connection.id));

      try {
        await sendToCfQueue(QUEUES.ga4AnalyticsSync, { projectId, userId });
      } catch {
        // manual sync remains available
      }

      return withCors(request, Response.json({ ok: true }));
    } catch {
      return withCors(
        request,
        Response.json({ error: "Failed to save property selection" }, { status: 502 }),
      );
    }
  }

  return null;
}
