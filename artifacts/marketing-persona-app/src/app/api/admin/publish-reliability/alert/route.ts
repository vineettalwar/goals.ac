import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { sendPublishReliabilityDigest } from "@workspace/content-engine/support/publishing/publish-reliability-digest";

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = (await req.json().catch(() => ({}))) as { windowHours?: number };
  const result = await sendPublishReliabilityDigest({ windowHours: body.windowHours ?? 24 });

  return NextResponse.json(result);
}
