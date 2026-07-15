import { db } from "@workspace/db";
import {
  platformSettingsTable,
  SEARCH_PROPERTY_PROVIDERS,
  searchPropertyConnectionsTable,
  type SearchPropertyProvider,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { getAccessibleProject } from "./project-access";

const AI_REPORT_LABELS: Record<SearchPropertyProvider, string> = {
  google_search_console: "Generative AI performance (Search Console)",
  bing_webmaster: "AI Performance (Bing Webmaster)",
};

const API_INGESTION_NOTES: Record<SearchPropertyProvider, string> = {
  google_search_console:
    "Search queries, impressions, and positions sync on Keyword research → Article ideas. AI Overview metrics remain in the Search Console UI.",
  bing_webmaster:
    "Citation counts are visible in Bing AI Performance. API ingestion is on Microsoft's backlog — open the report for now.",
};

function buildAiReportUrl(provider: SearchPropertyProvider, propertyUrl: string | null): string | null {
  if (!propertyUrl) return null;
  if (provider === "google_search_console") {
    const encoded = encodeURIComponent(propertyUrl);
    return `https://search.google.com/search-console/performance/search-analytics?resource_id=${encoded}&breakdown=page`;
  }
  if (provider === "bing_webmaster") {
    return "https://www.bing.com/webmasters/aiperformance";
  }
  return null;
}

function maskAccountEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

function toIsoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : null;
}

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
    accountEmail: maskAccountEmail(row.accountEmail),
    connectedAt: toIsoString(row.connectedAt),
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

function hasGoogleCredentials(env: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim());
}

function hasBingCredentials(env: {
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
}): boolean {
  return Boolean(
    env.BING_WEBMASTER_CLIENT_ID?.trim() && env.BING_WEBMASTER_CLIENT_SECRET?.trim(),
  );
}

async function oauthConfigured(env: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
}) {
  let googleIntegrationsEnabled = true;
  let bingWebmasterEnabled = true;
  try {
    const [row] = await db
      .select({
        googleIntegrationsEnabled: platformSettingsTable.googleIntegrationsEnabled,
        bingWebmasterEnabled: platformSettingsTable.bingWebmasterEnabled,
      })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1));
    googleIntegrationsEnabled = row?.googleIntegrationsEnabled ?? true;
    bingWebmasterEnabled = row?.bingWebmasterEnabled ?? true;
  } catch {
    // Unmigrated platform_settings — default to enabled flags.
  }

  return {
    googleSearchConsole: googleIntegrationsEnabled && hasGoogleCredentials(env),
    bingWebmaster: bingWebmasterEnabled && hasBingCredentials(env),
  };
}

export async function handleSearchPropertiesGet(
  request: Request,
  projectId: number,
  userId: number,
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    BING_WEBMASTER_CLIENT_ID?: string;
    BING_WEBMASTER_CLIENT_SECRET?: string;
  },
): Promise<Response> {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
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

  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const connections = SEARCH_PROPERTY_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    return row ? serializeConnection(row) : emptyStatus(provider);
  });

  return withCors(
    request,
    Response.json({
      connections,
      oauthConfigured: await oauthConfigured(env),
    }),
  );
}
