import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getUsageSummaryForUser } from "@/lib/usage";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const summary = await getUsageSummaryForUser(userId!);
  return NextResponse.json({ usage: summary });
}
