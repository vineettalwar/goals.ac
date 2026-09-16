import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentRunsTable, contentPiecesTable } from "@workspace/db/schema";
import type { AgentRunRecord, TrajectorySink } from "./types";

async function stampPieceAgentRunId(pieceId: number, agentRunId: number) {
  const [row] = await db
    .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!row) return;
  const prev = row.pieceMetadata ?? {};
  if (prev.agentRunId === agentRunId) return;
  await db
    .update(contentPiecesTable)
    .set({ pieceMetadata: { ...prev, agentRunId } })
    .where(eq(contentPiecesTable.id, pieceId));
}

export function dbTrajectorySink(): TrajectorySink {
  return {
    async save(run: AgentRunRecord) {
      const row = {
        websiteProjectId: run.websiteProjectId,
        userId: run.userId ?? null,
        goalKind: run.goal.kind,
        goal: run.goal as unknown as Record<string, unknown>,
        status: run.status,
        stopReason: run.stopReason,
        policy: {
          ...(run.policy as unknown as Record<string, unknown>),
          ...(run.pendingApproval ? { pendingApproval: run.pendingApproval } : {}),
        },
        trajectory: run.trajectory,
        creditsSpent: run.creditsSpent,
        contentPieceId: run.contentPieceId ?? null,
        updatedAt: new Date(),
      };

      if (run.id) {
        await db.update(agentRunsTable).set(row).where(eq(agentRunsTable.id, run.id));
      } else {
        const [inserted] = await db.insert(agentRunsTable).values(row).returning({ id: agentRunsTable.id });
        if (inserted) run.id = inserted.id;
      }

      if (run.id && run.contentPieceId) {
        await stampPieceAgentRunId(run.contentPieceId, run.id);
      }
    },
  };
}

export async function loadAgentRun(id: number): Promise<AgentRunRecord | null> {
  const [row] = await db.select().from(agentRunsTable).where(eq(agentRunsTable.id, id)).limit(1);
  if (!row) return null;
  const policy = row.policy as AgentRunRecord["policy"];
  return {
    id: row.id,
    websiteProjectId: row.websiteProjectId,
    userId: row.userId,
    goal: row.goal as AgentRunRecord["goal"],
    status: row.status,
    stopReason: row.stopReason,
    policy,
    trajectory: (row.trajectory ?? []) as AgentRunRecord["trajectory"],
    creditsSpent: row.creditsSpent,
    contentPieceId: row.contentPieceId,
    pendingApproval: policy?.pendingApproval,
  };
}

export async function listAgentRunsForProject(projectId: number, limit = 20) {
  return db
    .select()
    .from(agentRunsTable)
    .where(eq(agentRunsTable.websiteProjectId, projectId))
    .orderBy(desc(agentRunsTable.createdAt))
    .limit(limit);
}
