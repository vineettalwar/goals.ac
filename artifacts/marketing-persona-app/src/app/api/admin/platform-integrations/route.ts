import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import {
  clearStoredResendCredentials,
  clearStoredStripeCredentials,
  getPlatformIntegrationStatus,
  saveResendCredentials,
  saveStripeCredentials,
} from "@/lib/platform/platform-integration-secrets";

const stripeBodySchema = z.object({
  integration: z.literal("stripe"),
  secretKey: z.string().min(8).optional(),
  webhookSecret: z.string().min(8).optional(),
  priceGrowthMonthly: z.string().trim().optional().nullable(),
  priceScaleMonthly: z.string().trim().optional().nullable(),
});

const resendBodySchema = z.object({
  integration: z.literal("resend"),
  apiKey: z.string().min(8).optional(),
  fromEmail: z.string().email().optional().nullable(),
});

const patchSchema = z.discriminatedUnion("integration", [stripeBodySchema, resendBodySchema]);

const deleteSchema = z.object({
  integration: z.enum(["stripe", "resend"]),
});

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const status = await getPlatformIntegrationStatus();
  return NextResponse.json(status);
}

export async function PATCH(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    if (data.integration === "stripe") {
      if (
        data.secretKey === undefined &&
        data.webhookSecret === undefined &&
        data.priceGrowthMonthly === undefined &&
        data.priceScaleMonthly === undefined
      ) {
        return NextResponse.json({ error: "No Stripe fields to update" }, { status: 400 });
      }

      await saveStripeCredentials({
        secretKey: data.secretKey,
        webhookSecret: data.webhookSecret,
        priceGrowthMonthly: data.priceGrowthMonthly,
        priceScaleMonthly: data.priceScaleMonthly,
        updatedBy: admin.userId!,
      });
    } else {
      if (data.apiKey === undefined && data.fromEmail === undefined) {
        return NextResponse.json({ error: "No Resend fields to update" }, { status: 400 });
      }

      await saveResendCredentials({
        apiKey: data.apiKey,
        fromEmail: data.fromEmail,
        updatedBy: admin.userId!,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    const status = message.includes("environment variables") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const status = await getPlatformIntegrationStatus();
  return NextResponse.json({ ok: true, status });
}

export async function DELETE(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (parsed.data.integration === "stripe") {
      await clearStoredStripeCredentials(admin.userId!);
    } else {
      await clearStoredResendCredentials(admin.userId!);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clear failed";
    const status = message.includes("environment variables") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const status = await getPlatformIntegrationStatus();
  return NextResponse.json({ ok: true, status });
}
