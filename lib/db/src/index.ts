export { db, d1Db, getDb, setD1Binding, type GoalsDatabase } from "./db-instance";
export { getDbDialect, isD1Dialect, type DbDialect } from "./dialect";
export { createD1Db, type D1DatabaseBinding, type GoalsD1Database } from "./d1";
export { getPostgresDb, getPostgresPool, closePostgresPool } from "./postgres";
export {
  countAsInt,
  countDistinctAsInt,
  sumAsInt,
  coalesceSumAsInt,
  ilikeCompat,
  jsonTextAt,
  jsonTextEquals,
  advisoryXactLock,
  isUniqueConstraintError,
  isJobsUnavailable,
} from "./sql-compat";

export * from "./schema";
export * from "./slugify";
