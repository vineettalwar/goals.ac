import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { z } from "zod";

const UpdateBrandVoiceBody = z.object({
  writingExamples: z.array(z.string()).optional(),
  brandGlossary: z.array(z.string()).optional(),
  antiPatterns: z.array(z.string()).optional(),
  typicalStructure: z.string().optional(),
  doWords: z.array(z.string()).optional(),
  dontWords: z.array(z.string()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return Response.json({ error: "Invalid project id" }, { status: 400 });

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const [brandProfile] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  if (!brandProfile) return Response.json({ error: "Brand profile not found" }, { status: 404 });

  return Response.json({
    writingExamples: brandProfile.writingExamples,
    brandGlossary: brandProfile.brandGlossary,
    antiPatterns: brandProfile.antiPatterns,
    typicalStructure: brandProfile.typicalStructure,
    doWords: brandProfile.doWords,
    dontWords: brandProfile.dontWords,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return Response.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateBrandVoiceBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const [updated] = await db
    .update(brandProfilesTable)
    .set(updates)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .returning();

  if (!updated) return Response.json({ error: "Brand profile not found" }, { status: 404 });

  return Response.json({
    writingExamples: updated.writingExamples,
    brandGlossary: updated.brandGlossary,
    antiPatterns: updated.antiPatterns,
    typicalStructure: updated.typicalStructure,
    doWords: updated.doWords,
    dontWords: updated.dontWords,
  });
}
