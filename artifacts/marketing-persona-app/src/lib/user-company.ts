import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function getCompanyIdForUser(userId: number): Promise<number | null> {
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  return company?.id ?? null;
}
