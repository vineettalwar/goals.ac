import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  SEARCH_PROPERTY_PROVIDERS,
  searchPropertyConnectionsTable,
} from "@workspace/db/schema";
import type { SearchPropertyConnectionsResponse, SearchPropertyProvider } from "@/lib/integrations/search/search-property-types";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  AI_REPORT_LABELS,
  API_INGESTION_NOTES,
  buildAiReportUrl,
} from "@/lib/integrations/search/search-property-links";
import { z } from "zod";
import {
  encryptStoredTokens,
  listPropertiesForProvider,
  parseStoredTokens,
  resolveAccessToken,
} from "@/lib/integrations/search/search-property-client";
import { getPlatformSettings } from "@/lib/platform/platform-settings";
import {
  bingWebmasterAvailable,
  googleIntegrationsAvailable,
} from "@/lib/platform/platform-features";

function serializeConnection(row: {
  provider: string;
  propertyUrl: string | null;
  propertyVerified: boolean;
  accountEmail: string | null;
  connectedAt: Date;
}) {
  const provider = row.provider as SearchPropertyProvider;
  return {
    provider,
    connected: true,
    propertyUrl: row.propertyUrl,
    propertyVerified: row.propertyVerified,
    accountEmail: row.accountEmail,
    connectedAt: row.connectedAt.toISOString(),
    aiReportUrl: buildAiReportUrl(provider, row.propertyUrl),
    aiReportLabel: AI_REPORT_LABELS[provider],
    aiReportAvailable: true,
    apiIngestionNote: API_INGESTION_NOTES[provider],
  };
}

function emptyStatus(provider: SearchPropertyProvider) {
  return {
    provider,
    connected: false,
    propertyUrl: null,
    propertyVerified: false,
    accountEmail: null,
    connectedAt: null,
    aiReportUrl: null,
    aiReportLabel: AI_REPORT_LABELS[provider],
    aiReportAvailable: true,
    apiIngestionNote: API_INGESTION_NOTES[provider],
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
      provider: searchPropertyConnectionsTable.provider,
      propertyUrl: searchPropertyConnectionsTable.propertyUrl,
      propertyVerified: searchPropertyConnectionsTable.propertyVerified,
      accountEmail: searchPropertyConnectionsTable.accountEmail,
      connectedAt: searchPropertyConnectionsTable.connectedAt,
    })
    .from(searchPropertyConnectionsTable)
    .where(eq(searchPropertyConnectionsTable.projectId, projectId));

  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const connections = SEARCH_PROPERTY_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    return row ? serializeConnection(row) : emptyStatus(provider);
  });

  const settings = await getPlatformSettings();
  const payload: SearchPropertyConnectionsResponse = {
    connections,
    oauthConfigured: {
      googleSearchConsole: googleIntegrationsAvailable(settings),
      bingWebmaster: bingWebmasterAvailable(settings),
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

  const provider = new URL(req.url).searchParams.get("provider") as SearchPropertyProvider | null;
  if (!provider || !SEARCH_PROPERTY_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "provider query param is required" }, { status: 400 });
  }

  await db
    .delete(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, projectId),
        eq(searchPropertyConnectionsTable.provider, provider),
      ),
    );

  return NextResponse.json({ ok: true });
}

const SelectPropertyBody = z.object({
  provider: z.enum(["google_search_console", "bing_webmaster"]),
  propertyUrl: z.string().min(1),
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

  const { provider, propertyUrl } = parsed.data;

  const [connection] = await db
    .select({
      id: searchPropertyConnectionsTable.id,
      encryptedTokens: searchPropertyConnectionsTable.encryptedTokens,
    })
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, projectId),
        eq(searchPropertyConnectionsTable.provider, provider),
      ),
    )
    .limit(1);

  if (!connection) {
    return NextResponse.json({ error: "Connect this provider first" }, { status: 404 });
  }

  try {
    let tokens = parseStoredTokens(connection.encryptedTokens);
    const resolved = await resolveAccessToken(provider, tokens);
    tokens = resolved.tokens;

    if (resolved.refreshed) {
      await db
        .update(searchPropertyConnectionsTable)
        .set({ encryptedTokens: encryptStoredTokens(tokens) })
        .where(eq(searchPropertyConnectionsTable.id, connection.id));
    }

    const available = await listPropertiesForProvider(provider, resolved.accessToken);
    if (!available.includes(propertyUrl)) {
      return NextResponse.json({ error: "Property is not in your verified account" }, { status: 400 });
    }

    await db
      .update(searchPropertyConnectionsTable)
      .set({
        propertyUrl,
        propertyVerified: true,
      })
      .where(eq(searchPropertyConnectionsTable.id, connection.id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save property selection" }, { status: 502 });
  }
}
