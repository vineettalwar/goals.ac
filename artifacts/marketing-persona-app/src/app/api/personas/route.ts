import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { marketingPersonasTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const companyId = parseInt(url.searchParams.get("companyId") ?? "", 10);
  if (isNaN(companyId)) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  // Verify company ownership
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(and(eq(companiesTable.id, companyId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const personas = await db
    .select()
    .from(marketingPersonasTable)
    .where(eq(marketingPersonasTable.companyId, companyId));

  return NextResponse.json({ personas });
}
