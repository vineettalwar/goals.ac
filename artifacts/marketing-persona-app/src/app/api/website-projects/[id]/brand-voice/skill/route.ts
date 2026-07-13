import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import {
  getBrandVoiceSkill,
  regenerateBrandVoiceSkill,
  updateBrandVoiceSkill,
} from "@workspace/content-engine/brand-voice-skill";

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

  const regenerated = await regenerateBrandVoiceSkill(projectId);
  const skill = await getBrandVoiceSkill(projectId);
  return NextResponse.json({ ...skill, regenerated: Boolean(regenerated) });
}
