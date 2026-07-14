export type DbDialect = "postgres" | "d1";

let bindingDialect: DbDialect | null = null;

/** When a D1 binding is wired (Workers), force d1 dialect regardless of process.env. */
export function setBindingDialect(dialect: DbDialect | null): void {
  bindingDialect = dialect;
}

/** `DB_DIALECT=d1` on Cloudflare Workers; default `postgres` for Docker/local. */
export function getDbDialect(): DbDialect {
  if (bindingDialect) return bindingDialect;
  const raw = process.env.DB_DIALECT?.trim().toLowerCase();
  return raw === "d1" ? "d1" : "postgres";
}

export function isD1Dialect(): boolean {
  return getDbDialect() === "d1";
}
