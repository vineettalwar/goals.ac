import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { requireSiteAdmin } from "@/lib/require-site-admin";
import {
  insertArticleIdeas,
  listArticleIdeaImports,
} from "@workspace/content-engine/article-ideas-import-service";

const ManualIdeaSchema = z.object({
  keyword: z.string().min(1),
  suggestedTitle: z.string().min(1),
  suggestedAngle: z.string().optional(),
  estimatedVolume: z.string().optional(),
  intent: z.string().optional(),
  difficulty: z.enum(["low", "medium", "high"]).optional(),
});

const ManualBodySchema = z.union([
  ManualIdeaSchema,
  z.object({ ideas: z.array(ManualIdeaSchema).min(1) }),
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const imports = await listArticleIdeaImports(projectId);
  return NextResponse.json({ imports });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = ManualBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows =
    "ideas" in parsed.data
      ? parsed.data.ideas.map((idea) => ({
          keyword: idea.keyword,
          suggestedTitle: idea.suggestedTitle,
          suggestedAngle: idea.suggestedAngle ?? "",
          estimatedVolume: idea.estimatedVolume,
          intent: idea.intent,
          difficulty: idea.difficulty,
        }))
      : [
          {
            keyword: parsed.data.keyword,
            suggestedTitle: parsed.data.suggestedTitle,
            suggestedAngle: parsed.data.suggestedAngle ?? "",
            estimatedVolume: parsed.data.estimatedVolume,
            intent: parsed.data.intent,
            difficulty: parsed.data.difficulty,
          },
        ];

  const result = await insertArticleIdeas({
    projectId,
    userId: userId!,
    rows,
    source: "manual",
  });

  return NextResponse.json(result);
}
