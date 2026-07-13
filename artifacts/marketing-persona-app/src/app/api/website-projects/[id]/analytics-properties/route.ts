import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  ANALYTICS_PROPERTY_PROVIDERS,
  analyticsPropertyConnectionsTable,
} from "@workspace/db/schema";
import type { AnalyticsPropertyProvider } from "@workspace/db/schema";
import type { AnalyticsPropertyConnectionsResponse } from "@/lib/analytics-property-types";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { z } from "zod";
import { enqueue, QUEUES } from "@workspace/jobs";
import {
  encryptStoredTokens,
  listGa4PropertiesForConnection,
  parseStoredTokens,
  resolveAccessToken,
} from "@/lib/analytics-property-client";

const UNSELECTED_PROPERTY_ID = "";

function toNullablePropertyId(propertyId: string): string | null {
  return propertyId && propertyId !== UNSELECTED_PROPERTY_ID ? propertyId : null;
}

function serializeConnection(row: {
  provider: string;
  propertyId: string;
  propertyName: string | null;
  streamId: string | null;
  propertyVerified: boolean;
  accountEmail: string | null;
  connectedAt: Date;
}) {
  const provider = row.provider as AnalyticsPropertyProvider;
  return {
    provider,
    connected: true,
    propertyId: toNullablePropertyId(row.propertyId),
    propertyName: row.propertyName,
    streamId: row.streamId,
    propertyVerified: row.propertyVerified,
    accountEmail: row.accountEmail,
    connectedAt: row.connectedAt.toISOString(),
  };
}

function emptyStatus(provider: AnalyticsPropertyProvider) {
  return {
    provider,
    connected: false,
    propertyId: null,
    propertyName: null,
    streamId: null,
    propertyVerified: false,
    accountEmail: null,
    connectedAt: null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const rows = await db
    .select({
      provider: analyticsPropertyConnectionsTable.provider,
      propertyId: analyticsPropertyConnectionsTable.propertyId,
      propertyName: analyticsPropertyConnectionsTable.propertyName,
      streamId: analyticsPropertyConnectionsTable.streamId,
      propertyVerified: analyticsPropertyConnectionsTable.propertyVerified,
      accountEmail: analyticsPropertyConnectionsTable.accountEmail,
      connectedAt: analyticsPropertyConnectionsTable.connectedAt,
    })
    .from(analyticsPropertyConnectionsTable)
    .where(eq(analyticsPropertyConnectionsTable.projectId, projectId));

  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const connections = ANALYTICS_PROPERTY_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    return row ? serializeConnection(row) : emptyStatus(provider);
  });

  const payload: AnalyticsPropertyConnectionsResponse = {
    connections,
    oauthConfigured: {
      googleAnalytics4: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  };

  return NextResponse.json(payload);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const provider = new URL(req.url).searchParams.get("provider") as AnalyticsPropertyProvider | null;
  if (!provider || !ANALYTICS_PROPERTY_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "provider query param is required" }, { status: 400 });
  }

  await db
    .delete(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, projectId),
        eq(analyticsPropertyConnectionsTable.provider, provider),
      ),
    );

  return NextResponse.json({ ok: true });
}

const SelectPropertyBody = z.object({
  propertyId: z.string().min(1),
  streamId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = SelectPropertyBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { propertyId, streamId } = parsed.data;

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
    return NextResponse.json({ error: "Connect Google Analytics first" }, { status: 404 });
  }

  try {
    let tokens = parseStoredTokens(connection.encryptedTokens);
    const resolved = await resolveAccessToken(tokens);
    tokens = resolved.tokens;

    if (resolved.refreshed) {
      await db
        .update(analyticsPropertyConnectionsTable)
        .set({ encryptedTokens: encryptStoredTokens(tokens) })
        .where(eq(analyticsPropertyConnectionsTable.id, connection.id));
    }

    const available = await listGa4PropertiesForConnection(resolved.accessToken);
    const selected = available.find((property) => property.propertyId === propertyId);
    if (!selected) {
      return NextResponse.json({ error: "Property is not in your verified account" }, { status: 400 });
    }

    const resolvedStreamId = streamId ?? selected.streamId;

    await db
      .update(analyticsPropertyConnectionsTable)
      .set({
        propertyId: selected.propertyId,
        propertyName: selected.propertyName,
        streamId: resolvedStreamId,
        propertyVerified: true,
      })
      .where(eq(analyticsPropertyConnectionsTable.id, connection.id));

    try {
      await enqueue(QUEUES.ga4AnalyticsSync, { projectId, userId: userId! });
    } catch {
      // manual sync remains available
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save property selection" }, { status: 502 });
  }
}
