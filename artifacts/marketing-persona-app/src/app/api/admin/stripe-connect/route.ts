import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { disconnectStripeConnect } from "@/lib/platform/platform-integration-secrets";
import { startStripeConnectOAuth } from "@/lib/platform/stripe-connect-oauth";

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  startStripeConnectOAuth(admin.userId!);
}

export async function DELETE() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  try {
    await disconnectStripeConnect(admin.userId!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Disconnect failed";
    const status = message.includes("environment variables") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
