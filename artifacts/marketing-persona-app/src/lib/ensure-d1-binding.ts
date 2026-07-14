import { getCloudflareContext } from "@opennextjs/cloudflare";
import { setD1Binding } from "@workspace/db";

let initialized = false;

/** Wire the Cloudflare D1 binding into @workspace/db (Workers runtime only). */
export function ensureD1Binding(): void {
  if (initialized) return;
  if (process.env.DB_DIALECT?.trim().toLowerCase() !== "d1") return;

  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB);
      initialized = true;
    }
  } catch {
    // next dev / Node.js — D1 is unavailable; use postgres or cf:preview.
  }
}
