import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "paid_plans_unavailable", message: "Only the free Starter plan is available. Use BYOK in Settings → AI Providers." },
    { status: 410 },
  );
}
