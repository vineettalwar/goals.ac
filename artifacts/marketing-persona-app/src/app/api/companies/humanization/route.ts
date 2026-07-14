import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { syncCompanyHumanizationToProject } from "@workspace/content-engine/support/brand-context-loader";
import { z } from "zod";

const schema = z.object({
  companyId: z.number(),
  humanizationLevel: z.enum(["off", "light", "strong"]),
  writingSample: z.string().max(10000).nullable().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const [company] = await db
    .update(companiesTable)
    .set({
      humanizationLevel: parsed.data.humanizationLevel,
      writingSample: parsed.data.writingSample?.trim() ? parsed.data.writingSample.trim() : null,
    })
    .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId!)))
    .returning();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  await syncCompanyHumanizationToProject(userId!, company, parsed.data.humanizationLevel, parsed.data.writingSample?.trim() ? parsed.data.writingSample.trim() : null);

  return NextResponse.json({
    company: {
      id: company.id,
      humanizationLevel: company.humanizationLevel,
      writingSample: company.writingSample,
    },
  });
}
