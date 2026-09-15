import { db } from "./db";
import {
  briefsTable,
  goalsTable,
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { getAccessibleProject } from "./project-access";

const AI_NOT_CONFIGURED_MESSAGE =
  "AI is not configured. Add your API key in Integrations → AI, or ask your admin to set a platform key.";

export async function assertAiGenerationReady(
  userId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await resolveAiClientForUser(userId);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "AI provider is not configured";
    if (/not configured|no gemini api key/i.test(detail)) {
      return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };
    }
    return { ok: false, message: detail };
  }
}

export const GENERATABLE_STATUSES = new Set(["draft", "pending", "failed"]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const patchBody = z
  .object({
    title: z.string().optional(),
    bodyMarkdown: z.string().optional(),
    status: z.enum(["draft", "ready"]).optional(),
    plannedDate: z
      .string()
      .regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)")
      .nullable()
      .optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    approvalStatus: z
      .enum(["draft", "pending_review", "approved", "rejected"])
      .optional(),
    cmsRemoteId: z.string().trim().min(1).max(40).nullable().optional(),
    evergreenConfig: z
      .object({
        enabled: z.boolean(),
        recycleIntervalDays: z.number().int().min(7).max(365),
        maxRecycles: z.number().int().min(1).max(50).optional(),
        recycleCount: z.number().int().min(0).optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

export const createDraftBody = z.object({
  title: z.string().trim().min(1, "Title is required"),
  targetKeyword: z.string().trim().min(1, "Target keyword is required"),
  formatType: z.enum(CONTENT_FORMAT_TYPES).optional().default("blog_post"),
  briefId: z.number().int().positive().optional(),
});

/** Mirrors Next `loadBriefForProject` — confirms the brief's goal belongs to this project. */
export async function loadBriefForProject(briefId: number, projectId: number) {
  const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1);
  if (!brief) return null;

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, brief.goalId)).limit(1);
  if (!goal || goal.projectId !== projectId) return null;

  return brief;
}

export function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

export async function loadPieceForUser(contentPieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const project = await getAccessibleProject(piece.websiteProjectId, userId);
  if (!project) return { piece: null, error: "forbidden" as const };

  return { piece, error: null };
}

export type TrackJob = (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>;
