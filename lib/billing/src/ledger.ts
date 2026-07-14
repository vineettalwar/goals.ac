import { and, eq, sql } from "drizzle-orm";
import { db, creditLedgerTable } from "@workspace/db";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === UNIQUE_VIOLATION;
}

/** Sum of all ledger rows for a workspace — there is no stored balance, it is always derived. */
export async function getBalance(workspaceId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${creditLedgerTable.amount}), 0)` })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}

export interface ReserveCreditsInput {
  workspaceId: number;
  runId: string;
  /** Positive estimated cost to reserve. */
  amount: number;
  meta?: Record<string, unknown>;
}

export type ReserveCreditsResult = { ok: true } | { ok: false; reason: "insufficient_credits" };

export async function reserveCredits({
  workspaceId,
  runId,
  amount,
  meta,
}: ReserveCreditsInput): Promise<ReserveCreditsResult> {
  if (amount <= 0) throw new Error("reserveCredits: amount must be positive");

  try {
    return await db.transaction(async (tx) => {
      // SUM(amount) has no physical row to lock with SELECT ... FOR UPDATE, so a
      // per-workspace transaction-scoped advisory lock serializes the
      // check-then-insert critical section instead — concurrent reservations for
      // the same workspace queue up rather than both reading a stale balance.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`credit_ledger:${workspaceId}`}))`);

      const [row] = await tx
        .select({ total: sql<string>`coalesce(sum(${creditLedgerTable.amount}), 0)` })
        .from(creditLedgerTable)
        .where(eq(creditLedgerTable.workspaceId, workspaceId));
      const balance = Number(row?.total ?? 0);

      if (balance - amount < 0) {
        return { ok: false, reason: "insufficient_credits" } as const;
      }

      await tx.insert(creditLedgerTable).values({
        workspaceId,
        entryType: "reserve",
        amount: -amount,
        runId,
        meta: meta ?? null,
      });

      return { ok: true } as const;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // The unique index on runId already rejected a duplicate insert — this is
      // a retried/duplicate call for a reservation that already landed, so treat
      // it as an idempotent replay rather than an error.
      return { ok: true };
    }
    throw err;
  }
}

export type SettlementEntryType = "model_consumption" | "orchestration";

export interface SettlementLine {
  entryType: SettlementEntryType;
  /** Positive actual cost incurred. */
  actualAmount: number;
}

export interface SettleReservationLinesInput {
  runId: string;
  lines: SettlementLine[];
  usageEventId?: number;
}

export async function settleReservationLines({
  runId,
  lines,
  usageEventId,
}: SettleReservationLinesInput): Promise<void> {
  for (const line of lines) {
    if (line.actualAmount < 0) {
      throw new Error("settleReservationLines: actualAmount must be non-negative");
    }
  }

  const totalActual = lines.reduce((sum, line) => sum + line.actualAmount, 0);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`credit_ledger:${runId}`}))`);

    const [reservation] = await tx
      .select()
      .from(creditLedgerTable)
      .where(and(eq(creditLedgerTable.runId, runId), eq(creditLedgerTable.entryType, "reserve")))
      .limit(1);

    if (!reservation) {
      throw new Error(`settleReservationLines: no reservation found for runId "${runId}"`);
    }

    const [existingConsumption] = await tx
      .select({ id: creditLedgerTable.id })
      .from(creditLedgerTable)
      .where(
        and(
          sql`${creditLedgerTable.meta} ->> 'reservationRunId' = ${runId}`,
          sql`${creditLedgerTable.entryType} in ('model_consumption', 'orchestration')`,
        ),
      )
      .limit(1);

    if (existingConsumption) return;

    const reservedAmount = Math.abs(reservation.amount);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.actualAmount === 0) continue;

      await tx.insert(creditLedgerTable).values({
        workspaceId: reservation.workspaceId,
        entryType: line.entryType,
        amount: -line.actualAmount,
        usageEventId: i === 0 ? (usageEventId ?? null) : null,
        meta: { reservationRunId: runId },
      });
    }

    const releaseAmount = reservedAmount - totalActual;
    if (releaseAmount > 0) {
      await tx.insert(creditLedgerTable).values({
        workspaceId: reservation.workspaceId,
        entryType: "release",
        amount: releaseAmount,
        meta: { reservationRunId: runId },
      });
    } else if (releaseAmount < 0) {
      console.warn(
        `settleReservationLines: total actual (${totalActual}) exceeded reservedAmount (${reservedAmount}) for runId "${runId}"; settled at actual cost, no release issued`,
      );
    }
  });
}

export interface SettleReservationInput {
  runId: string;
  /** Positive actual cost incurred. */
  actualAmount: number;
  entryType: SettlementEntryType;
  usageEventId?: number;
}

export async function settleReservation(input: SettleReservationInput): Promise<void> {
  await settleReservationLines({
    runId: input.runId,
    lines: [{ entryType: input.entryType, actualAmount: input.actualAmount }],
    usageEventId: input.usageEventId,
  });
}

export interface ReleaseReservationInput {
  runId: string;
  reason?: string;
}

export async function releaseReservation({ runId, reason }: ReleaseReservationInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`credit_ledger:${runId}`}))`);

    const [reservation] = await tx
      .select()
      .from(creditLedgerTable)
      .where(and(eq(creditLedgerTable.runId, runId), eq(creditLedgerTable.entryType, "reserve")))
      .limit(1);

    if (!reservation) {
      throw new Error(`releaseReservation: no reservation found for runId "${runId}"`);
    }

    // Idempotent no-op: a prior settle or release for this runId already
    // resolved the reservation, so there's nothing left to credit back.
    const [existing] = await tx
      .select({ id: creditLedgerTable.id })
      .from(creditLedgerTable)
      .where(sql`${creditLedgerTable.meta} ->> 'reservationRunId' = ${runId}`)
      .limit(1);

    if (existing) return;

    await tx.insert(creditLedgerTable).values({
      workspaceId: reservation.workspaceId,
      entryType: "release",
      amount: Math.abs(reservation.amount),
      meta: { reservationRunId: runId, reason: reason ?? null },
    });
  });
}

export interface GrantOrTopupInput {
  workspaceId: number;
  /** Positive amount to credit. */
  amount: number;
  meta?: Record<string, unknown>;
}

export async function grantCredits({ workspaceId, amount, meta }: GrantOrTopupInput): Promise<void> {
  if (amount <= 0) throw new Error("grantCredits: amount must be positive");
  await db.insert(creditLedgerTable).values({ workspaceId, entryType: "grant", amount, meta: meta ?? null });
}

export async function topupCredits({ workspaceId, amount, meta }: GrantOrTopupInput): Promise<void> {
  if (amount <= 0) throw new Error("topupCredits: amount must be positive");
  await db.insert(creditLedgerTable).values({ workspaceId, entryType: "topup", amount, meta: meta ?? null });
}
