import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrCreateOrganizationForUser } from "@/lib/org/org-access";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url(),
  industry: z.string().min(1),
  description: z.string().min(5),
  targetAudience: z.string().min(5),
  competitorUrls: z.array(z.string().url()).max(5).optional().default([]),
});

const updateSchema = createSchema.partial().extend({
  onboardingComplete: z.boolean().optional(),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const companies = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId!));

  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const [company] = await db
    .insert(companiesTable)
    .values({ ...parsed.data, userId: userId! })
    .returning();

  const organizationId = await getOrCreateOrganizationForUser({
    userId: userId!,
    name: parsed.data.name,
    companyId: company.id,
  });

  return NextResponse.json({ company, organizationId }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body?.data ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const companyId = body?.id;
  if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 });

  const [company] = await db
    .update(companiesTable)
    .set(parsed.data)
    .where(and(eq(companiesTable.id, companyId), eq(companiesTable.userId, userId!)))
    .returning();

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ company });
}
