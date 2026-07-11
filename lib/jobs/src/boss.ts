import PgBoss from "pg-boss";
import type { QueueName, QueuePayloadFor } from "./queues";

const PGBOSS_SCHEMA = "pgboss";

let bossPromise: Promise<PgBoss> | null = null;

function createBoss(): PgBoss {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. It is required to start the pg-boss job queue."
    );
  }

  const boss = new PgBoss({
    connectionString,
    schema: PGBOSS_SCHEMA,
  });

  // Prevent an unhandled 'error' event from crashing the process; callers
  // (e.g. the worker entrypoint) should attach their own listener for
  // structured logging in addition to this baseline.
  boss.on("error", (err) => {
    console.error("[@workspace/jobs] pg-boss error", err);
  });

  return boss;
}

/**
 * Returns the lazily-created, process-wide pg-boss singleton, starting it
 * on first use. Safe to call concurrently — all callers await the same
 * in-flight start.
 */
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = createBoss();
      await boss.start();
      return boss;
    })().catch((err: unknown) => {
      // Allow a subsequent call to retry instead of caching a permanent failure.
      bossPromise = null;
      throw err;
    });
  }
  return bossPromise;
}

/** Stops the pg-boss singleton (if started) and clears it for a clean shutdown. */
export async function stopBoss(): Promise<void> {
  if (!bossPromise) return;
  const current = bossPromise;
  bossPromise = null;
  const boss = await current;
  await boss.stop();
}

/**
 * Type-safe wrapper around `boss.send`. The queue must already exist
 * (pg-boss v10+ requires `createQueue` before `send`/`work` — the worker
 * entrypoint does this on startup for every queue in `QUEUES`).
 */
export async function enqueue<Q extends QueueName>(
  queue: Q,
  payload: QueuePayloadFor<Q>,
  options?: PgBoss.SendOptions
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(queue, payload, options ?? {});
}

/**
 * Type-safe wrapper around `boss.schedule` for recurring cron jobs.
 */
export async function scheduleCron<Q extends QueueName>(
  queue: Q,
  cron: string,
  payload?: QueuePayloadFor<Q>,
  options?: PgBoss.ScheduleOptions
): Promise<void> {
  const boss = await getBoss();
  await boss.schedule(queue, cron, payload ?? ({} as QueuePayloadFor<Q>), options);
}
