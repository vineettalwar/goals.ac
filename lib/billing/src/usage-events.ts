import { db } from "@workspace/db";
import {
  companiesTable,
  organizationsTable,
  usageEventsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.5 / 1_000_000;

export function estimateGenerationCostUsd(promptTokens: number, outputTokens: number): number {
  return promptTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}

export interface RecordUsageEventInput {
  userId: number;
  companyId?: number | null;
  eventType: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  usedByok: boolean;
  provider?: string;
  model?: string;
  tier?: string;
}

async function existingCompanyId(id: number | null | undefined): Promise<number | null> {
  if (id == null) return null;
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, id))
    .limit(1);
  return company?.id ?? null;
}

/** `usage_events.company_id` FKs to `companies`. Callers often pass a website project id. */
export async function resolveUsageCompanyId(
  id: number | null | undefined,
): Promise<number | null> {
  const direct = await existingCompanyId(id);
  if (direct != null) return direct;
  if (id == null) return null;
  const [fromProject] = await db
    .select({ orgCompanyId: organizationsTable.companyId })
    .from(websiteProjectsTable)
    .leftJoin(
      organizationsTable,
      eq(organizationsTable.id, websiteProjectsTable.organizationId),
    )
    .where(eq(websiteProjectsTable.id, id))
    .limit(1);
  return existingCompanyId(fromProject?.orgCompanyId);
}

export async function resolveUsageCompanyIdFromOrg(
  organizationId: number | null | undefined,
): Promise<number | null> {
  if (organizationId == null) return null;
  const [org] = await db
    .select({ companyId: organizationsTable.companyId })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  return existingCompanyId(org?.companyId);
}

export async function recordUsageEvent(input: RecordUsageEventInput): Promise<number> {
  const promptTokens = input.promptTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + outputTokens;
  const estimatedCostUsd =
    input.estimatedCostUsd ?? estimateGenerationCostUsd(promptTokens, outputTokens);
  const companyId = await resolveUsageCompanyId(input.companyId);

  const [row] = await db
    .insert(usageEventsTable)
    .values({
      userId: input.userId,
      companyId,
      eventType: input.eventType,
      promptTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: estimatedCostUsd.toFixed(6),
      usedByok: input.usedByok,
      provider: input.provider || null,
      model: input.model || null,
      tier: input.tier || null,
    })
    .returning({ id: usageEventsTable.id });

  return row!.id;
}
