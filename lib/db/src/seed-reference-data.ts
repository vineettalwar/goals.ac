import { db } from "./db-instance";
import { isD1Dialect } from "./dialect";
import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";
import { REFERENCE_INDUSTRIES, REFERENCE_LOCATIONS } from "./reference-data-constants";

function referenceTables() {
  return isD1Dialect() ? sqliteSchema : pgSchema;
}

export async function seedReferenceData(): Promise<void> {
  const { industriesTable, locationsTable } = referenceTables();
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
  const { industriesTable, locationsTable } = referenceTables();
  const [industryRow] = await db.select({ id: industriesTable.id }).from(industriesTable).limit(1);
  const [locationRow] = await db.select({ id: locationsTable.id }).from(locationsTable).limit(1);

  if (!industryRow || !locationRow) {
    await seedReferenceData();
  }
}
