import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import {
  clearStoredBlueskyCredentials,
  clearStoredLinkedInCredentials,
  clearStoredMetaCredentials,
  clearStoredPexelsCredentials,
  clearStoredPlatformBedrockCredentials,
  clearStoredResendCredentials,
  clearStoredStripeCredentials,
  clearStoredTwitterCredentials,
  clearStoredUnsplashCredentials,
  disconnectStripeConnect,
  getPlatformIntegrationStatus,
  saveBlueskyCredentials,
  saveLinkedInCredentials,
  saveMetaCredentials,
  savePexelsCredentials,
  savePlatformBedrockCredentials,
  saveResendCredentials,
  saveStripeCredentials,
  saveTwitterCredentials,
  saveUnsplashCredentials,
  setPlatformBedrockOrgGrants,
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

const unsplashBodySchema = z.object({
  integration: z.literal("unsplash"),
  accessKey: z.string().min(8).optional(),
});

const pexelsBodySchema = z.object({
  integration: z.literal("pexels"),
  apiKey: z.string().min(8).optional(),
});

const linkedinBodySchema = z.object({
  integration: z.literal("linkedin"),
  clientId: z.string().trim().min(4).optional().nullable(),
  clientSecret: z.string().min(8).optional(),
});

const twitterBodySchema = z.object({
  integration: z.literal("twitter"),
  clientId: z.string().trim().min(4).optional().nullable(),
  clientSecret: z.string().min(8).optional(),
});

const metaBodySchema = z.object({
  integration: z.literal("meta"),
  appId: z.string().trim().min(4).optional().nullable(),
  appSecret: z.string().min(8).optional(),
});

const blueskyBodySchema = z.object({
  integration: z.literal("bluesky"),
  clientName: z.string().trim().min(1).optional().nullable(),
  privateKeyJwk: z.string().min(8).optional(),
});

const bedrockBodySchema = z.object({
  integration: z.literal("bedrock"),
  accessKeyId: z.string().min(16).optional(),
  secretAccessKey: z.string().min(16).optional(),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1).optional().nullable(),
  model: z.string().trim().min(1).optional().nullable(),
  organizationIds: z.array(z.number().int().positive()).optional(),
});

const patchSchema = z.discriminatedUnion("integration", [
  stripeBodySchema,
  resendBodySchema,
  unsplashBodySchema,
  pexelsBodySchema,
  linkedinBodySchema,
  twitterBodySchema,
  metaBodySchema,
  blueskyBodySchema,
  bedrockBodySchema,
]);

const deleteSchema = z.object({
  integration: z.enum([
    "stripe",
    "stripe_connect",
    "resend",
    "unsplash",
    "pexels",
    "linkedin",
    "twitter",
    "meta",
    "bluesky",
    "bedrock",
  ]),
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
    } else if (data.integration === "resend") {
      if (data.apiKey === undefined && data.fromEmail === undefined) {
        return NextResponse.json({ error: "No Resend fields to update" }, { status: 400 });
      }

      await saveResendCredentials({
        apiKey: data.apiKey,
        fromEmail: data.fromEmail,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "unsplash") {
      if (data.accessKey === undefined) {
        return NextResponse.json({ error: "No Unsplash fields to update" }, { status: 400 });
      }

      await saveUnsplashCredentials({
        accessKey: data.accessKey,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "pexels") {
      if (data.apiKey === undefined) {
        return NextResponse.json({ error: "No Pexels fields to update" }, { status: 400 });
      }

      await savePexelsCredentials({
        apiKey: data.apiKey,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "linkedin") {
      if (data.clientId === undefined && data.clientSecret === undefined) {
        return NextResponse.json({ error: "No LinkedIn fields to update" }, { status: 400 });
      }

      await saveLinkedInCredentials({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "twitter") {
      if (data.clientId === undefined && data.clientSecret === undefined) {
        return NextResponse.json({ error: "No X fields to update" }, { status: 400 });
      }

      await saveTwitterCredentials({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "meta") {
      if (data.appId === undefined && data.appSecret === undefined) {
        return NextResponse.json({ error: "No Meta fields to update" }, { status: 400 });
      }

      await saveMetaCredentials({
        appId: data.appId,
        appSecret: data.appSecret,
        updatedBy: admin.userId!,
      });
    } else if (data.integration === "bluesky") {
      if (data.clientName === undefined && data.privateKeyJwk === undefined) {
        return NextResponse.json({ error: "No Bluesky fields to update" }, { status: 400 });
      }

      await saveBlueskyCredentials({
        clientName: data.clientName,
        privateKeyJwk: data.privateKeyJwk,
        updatedBy: admin.userId!,
      });
    } else {
      const hasCredFields =
        data.accessKeyId !== undefined ||
        data.secretAccessKey !== undefined ||
        data.sessionToken !== undefined ||
        data.region !== undefined ||
        data.model !== undefined;
      const hasGrants = data.organizationIds !== undefined;
      if (!hasCredFields && !hasGrants) {
        return NextResponse.json({ error: "No Bedrock fields to update" }, { status: 400 });
      }

      if (hasCredFields) {
        await savePlatformBedrockCredentials({
          accessKeyId: data.accessKeyId,
          secretAccessKey: data.secretAccessKey,
          sessionToken: data.sessionToken,
          region: data.region,
          model: data.model,
          updatedBy: admin.userId!,
        });
      }
      if (hasGrants) {
        await setPlatformBedrockOrgGrants(data.organizationIds!, admin.userId!);
      }
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
    switch (parsed.data.integration) {
      case "stripe":
        await clearStoredStripeCredentials(admin.userId!);
        break;
      case "stripe_connect":
        await disconnectStripeConnect(admin.userId!);
        break;
      case "resend":
        await clearStoredResendCredentials(admin.userId!);
        break;
      case "unsplash":
        await clearStoredUnsplashCredentials(admin.userId!);
        break;
      case "pexels":
        await clearStoredPexelsCredentials(admin.userId!);
        break;
      case "linkedin":
        await clearStoredLinkedInCredentials(admin.userId!);
        break;
      case "twitter":
        await clearStoredTwitterCredentials(admin.userId!);
        break;
      case "meta":
        await clearStoredMetaCredentials(admin.userId!);
        break;
      case "bluesky":
        await clearStoredBlueskyCredentials(admin.userId!);
        break;
      case "bedrock":
        await clearStoredPlatformBedrockCredentials(admin.userId!);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clear failed";
    const status = message.includes("environment variables") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const status = await getPlatformIntegrationStatus();
  return NextResponse.json({ ok: true, status });
}
