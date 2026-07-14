import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  usersTable,
  websiteProjectsTable,
  contentStrategiesTable,
  contentItemsTable,
  seoArticlesTable,
  geoAuditsTable,
  competitorAnalysesTable,
  keywordAnalysesTable,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { signOut } from "@/auth";

export async function DELETE() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    await db.transaction(async (tx) => {
      const userProjects = await tx
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.userId, userId!));

      if (userProjects.length > 0) {
        const projectIds = userProjects.map((p) => p.id);

        const strategies = await tx
          .select({ id: contentStrategiesTable.id })
          .from(contentStrategiesTable)
          .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));

        if (strategies.length > 0) {
          const strategyIds = strategies.map((s) => s.id);
          await tx.delete(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds));
        }

        await tx.delete(contentStrategiesTable).where(inArray(contentStrategiesTable.websiteProjectId, projectIds));
        await tx.delete(seoArticlesTable).where(inArray(seoArticlesTable.websiteProjectId, projectIds));
        await tx.delete(geoAuditsTable).where(inArray(geoAuditsTable.websiteProjectId, projectIds));
        await tx.delete(competitorAnalysesTable).where(inArray(competitorAnalysesTable.websiteProjectId, projectIds));
        await tx.delete(keywordAnalysesTable).where(inArray(keywordAnalysesTable.websiteProjectId, projectIds));
      }

      await tx.delete(usersTable).where(eq(usersTable.id, userId!));
    });

    await signOut({ redirect: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
