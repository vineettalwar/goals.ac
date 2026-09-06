import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { marketingPersonasTable, companiesTable } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  ageRange: z.string().optional(),
  jobTitle: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  preferredContent: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const personaId = parseInt(id, 10);
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Verify ownership via company join
  const [persona] = await db
    .select({ id: marketingPersonasTable.id, companyId: marketingPersonasTable.companyId })
    .from(marketingPersonasTable)
    .innerJoin(companiesTable, eq(companiesTable.id, marketingPersonasTable.companyId))
    .where(and(eq(marketingPersonasTable.id, personaId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Defense in depth: the write itself is re-scoped to companies owned by the
  // caller, independent of the ownership check above.
  const [updated] = await db
    .update(marketingPersonasTable)
    .set(parsed.data)
    .where(
      and(
        eq(marketingPersonasTable.id, personaId),
        inArray(
          marketingPersonasTable.companyId,
          db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.userId, userId!)),
        ),
      ),
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ persona: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const personaId = parseInt(id, 10);

  const [persona] = await db
    .select({ id: marketingPersonasTable.id })
    .from(marketingPersonasTable)
    .innerJoin(companiesTable, eq(companiesTable.id, marketingPersonasTable.companyId))
    .where(and(eq(marketingPersonasTable.id, personaId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Defense in depth: the write itself is re-scoped to companies owned by the
  // caller, independent of the ownership check above.
  const deleted = await db
    .delete(marketingPersonasTable)
    .where(
      and(
        eq(marketingPersonasTable.id, personaId),
        inArray(
          marketingPersonasTable.companyId,
          db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.userId, userId!)),
        ),
      ),
    )
    .returning({ id: marketingPersonasTable.id });

  if (deleted.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
