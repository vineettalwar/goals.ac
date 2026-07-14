import { db, getDb } from "./db-instance";
import type { GoalsD1Database } from "./d1";
import { isD1Dialect } from "./dialect";
import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";
import { REFERENCE_INDUSTRIES, REFERENCE_LOCATIONS } from "./reference-data-constants";

export async function seedReferenceData(): Promise<void> {
  if (isD1Dialect()) {
    const { industriesTable, locationsTable } = sqliteSchema;
    const d1 = getDb() as GoalsD1Database;
    for (const industry of REFERENCE_INDUSTRIES) {
      await d1
        .insert(industriesTable)
        .values(industry)
        .onConflictDoNothing({ target: industriesTable.slug });
    }
    for (const location of REFERENCE_LOCATIONS) {
      await d1
        .insert(locationsTable)
        .values(location)
        .onConflictDoNothing({ target: locationsTable.slug });
    }
    return;
  }

  const { industriesTable, locationsTable } = pgSchema;
  for (const industry of REFERENCE_INDUSTRIES) {
    await db
      .insert(industriesTable)
      .values(industry)
      .onConflictDoNothing({ target: industriesTable.slug });
  }
  for (const location of REFERENCE_LOCATIONS) {
    await db
      .insert(locationsTable)
      .values(location)
      .onConflictDoNothing({ target: locationsTable.slug });
  }
}

/** Seed industries/locations when tables are empty (e.g. after migrate without seed). */
export async function seedReferenceDataIfEmpty(): Promise<void> {
  if (isD1Dialect()) {
    const { industriesTable, locationsTable } = sqliteSchema;
    const d1 = getDb() as GoalsD1Database;
    const [industryRow] = await d1
      .select({ id: industriesTable.id })
      .from(industriesTable)
      .limit(1);
    const [locationRow] = await d1
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .limit(1);
    if (!industryRow || !locationRow) {
      await seedReferenceData();
    }
    return;
  }

  const { industriesTable, locationsTable } = pgSchema;
  const [industryRow] = await db
    .select({ id: industriesTable.id })
    .from(industriesTable)
    .limit(1);
  const [locationRow] = await db
    .select({ id: locationsTable.id })
    .from(locationsTable)
    .limit(1);
  if (!industryRow || !locationRow) {
    await seedReferenceData();
  }
}
