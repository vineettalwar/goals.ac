import { getPostgresDb } from "./postgres";
import { industriesTable, locationsTable } from "./schema";
import { REFERENCE_INDUSTRIES, REFERENCE_LOCATIONS } from "./reference-data-constants";

export async function seedReferenceData(): Promise<void> {
  const db = getPostgresDb();
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
export async function ensureReferenceData(): Promise<void> {
  const db = getPostgresDb();
  const [industryRow] = await db.select({ id: industriesTable.id }).from(industriesTable).limit(1);
  const [locationRow] = await db.select({ id: locationsTable.id }).from(locationsTable).limit(1);

  if (!industryRow || !locationRow) {
    await seedReferenceData();
  }
}
