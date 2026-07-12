import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import type { CmsIntegrationCredentials } from "@workspace/content-engine/support/cms-integrations";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projects = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId!));

  let hasNotion = false;
  let hasWebflow = false;
  let hasWordpress = false;
  let hasGhost = false;
  let hasWebhook = false;
  let hasShopify = false;
  let hasDrupal = false;
  let hasJoomla = false;
  let hasLinkedin = false;
  let hasTwitter = false;
  let hasMeta = false;

  for (const p of projects) {
    const stored = (p.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    if (stored.notion) hasNotion = true;
    if (stored.webflow) hasWebflow = true;
    if (stored.wordpress) hasWordpress = true;
    if (stored.ghost) hasGhost = true;
    if (stored.webhook) hasWebhook = true;
    if (stored.shopify) hasShopify = true;
    if (stored.drupal) hasDrupal = true;
    if (stored.joomla) hasJoomla = true;
    if (stored.linkedin) hasLinkedin = true;
    if (stored.twitter) hasTwitter = true;
    if (stored.meta) hasMeta = true;
  }

  return NextResponse.json({
    notion: hasNotion,
    webflow: hasWebflow,
    wordpress: hasWordpress,
    ghost: hasGhost,
    webhook: hasWebhook,
    shopify: hasShopify,
    drupal: hasDrupal,
    joomla: hasJoomla,
    linkedin: hasLinkedin,
    twitter: hasTwitter,
    meta: hasMeta,
  });
}
