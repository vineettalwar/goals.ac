import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  getDecryptedSemrushCredentialsForUser,
  getOrgAiSettingsForUser,
  hasOrgSemrushCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  contentLanguageLabel,
  isSemrushDatabaseMismatch,
  semrushDatabaseForLanguage,
} from "@workspace/content-engine/support/content/content-language";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [orgSettings, credentials, [project]] = await Promise.all([
    getOrgAiSettingsForUser(userId!),
    getDecryptedSemrushCredentialsForUser(userId!),
    db
      .select({
        autopilotSettings: websiteProjectsTable.autopilotSettings,
        contentStyle: websiteProjectsTable.contentStyle,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1),
  ]);

  const settings = parseAutopilotSettings(project?.autopilotSettings);
  const primaryLanguage =
    (project?.contentStyle as ContentStyle | null)?.primaryLanguage ?? "en";
  const database = orgSettings?.semrushDatabase ?? "us";
  const suggestedDatabase = semrushDatabaseForLanguage(primaryLanguage);

  return NextResponse.json({
    configured: hasOrgSemrushCredentials(orgSettings) && Boolean(credentials),
    database,
    primaryLanguage,
    primaryLanguageLabel: contentLanguageLabel(primaryLanguage),
    suggestedDatabase,
    databaseMismatch: isSemrushDatabaseMismatch(primaryLanguage, database),
    lastDiscoveryAt: settings.lastSemrushDiscoveryAt ?? null,
  });
}
