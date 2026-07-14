export type DbDialect = "postgres" | "d1";

/** `DB_DIALECT=d1` on Cloudflare Workers; default `postgres` for Docker/local. */
export function getDbDialect(): DbDialect {
  const raw = process.env.DB_DIALECT?.trim().toLowerCase();
  return raw === "d1" ? "d1" : "postgres";
}

export function isD1Dialect(): boolean {
  return getDbDialect() === "d1";
}
