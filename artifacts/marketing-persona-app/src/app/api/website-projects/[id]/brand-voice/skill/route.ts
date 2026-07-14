import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import {
  getBrandVoiceSkill,
  regenerateBrandVoiceSkill,
  updateBrandVoiceSkill,
} from "@workspace/content-engine/brand/brand-voice-skill";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const skill = await getBrandVoiceSkill(projectId);
  return NextResponse.json(skill);
}

const PutBody = z.object({
  skill: z.string(),
  skillLocked: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await updateBrandVoiceSkill(projectId, parsed.data.skill, parsed.data.skillLocked);
  const skill = await getBrandVoiceSkill(projectId);
  return NextResponse.json(skill);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const regenerated = await regenerateBrandVoiceSkill(projectId);
    const skill = await getBrandVoiceSkill(projectId);

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "brand_voice_skill",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return NextResponse.json({ ...skill, regenerated: Boolean(regenerated) });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return NextResponse.json({ error: "Failed to regenerate brand voice skill" }, { status: 500 });
  }
}
