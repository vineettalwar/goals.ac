import { withCors } from "@workspace/cf-edge/cors";
import {
  clearStoredPlatformBedrockCredentials,
  isBedrockManagedByEnv,
  loadPlatformBedrockCredentials,
  savePlatformBedrockCredentials,
  setPlatformBedrockOrgGrants,
} from "@workspace/platform-admin";
import { invalidateStripeClientCache } from "@workspace/billing";
import { encryptSecret } from "@workspace/security/encryption";
import { z } from "zod";
import { badRequest, upsertPlatformSettingsPatch } from "./admin-helpers";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const patchIntegrationSchema = z.discriminatedUnion("integration", [
  z.object({
    integration: z.literal("stripe"),
    secretKey: z.string().min(8).optional(),
    webhookSecret: z.string().min(8).optional(),
    priceGrowthMonthly: z.string().trim().optional().nullable(),
    priceScaleMonthly: z.string().trim().optional().nullable(),
  }),
  z.object({
    integration: z.literal("resend"),
    apiKey: z.string().min(8).optional(),
    fromEmail: z.string().email().optional().nullable(),
  }),
  z.object({
    integration: z.literal("unsplash"),
    accessKey: z.string().min(8).optional(),
  }),
  z.object({
    integration: z.literal("pexels"),
    apiKey: z.string().min(8).optional(),
  }),
  z.object({
    integration: z.literal("bedrock"),
    apiKey: z.string().min(16).optional(),
    accessKeyId: z.string().min(16).optional(),
    secretAccessKey: z.string().min(16).optional(),
    sessionToken: z.string().trim().optional().nullable(),
    region: z.string().trim().min(1).optional().nullable(),
    model: z.string().trim().min(1).optional().nullable(),
    organizationIds: z.array(z.number().int().positive()).optional(),
  }),
]);

const deleteIntegrationSchema = z.object({
  integration: z.enum(["stripe", "stripe_connect", "resend", "unsplash", "pexels", "bedrock"]),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAdminIntegrationRoutes(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  // ── PATCH /api/admin/platform-integrations ──────────────────────────────
  if (path === "/api/admin/platform-integrations" && method === "PATCH") {
    const body = await request.json().catch(() => null);
    const parsed = patchIntegrationSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    const data = parsed.data;

    try {
      if (data.integration === "stripe") {
        if (
          data.secretKey === undefined &&
          data.webhookSecret === undefined &&
          data.priceGrowthMonthly === undefined &&
          data.priceScaleMonthly === undefined
        ) {
          return badRequest(request, "No Stripe fields to update");
        }

        const patch = { updatedBy: userId } as Parameters<typeof upsertPlatformSettingsPatch>[0];
        if (data.secretKey !== undefined) {
          patch.encryptedStripeSecretKey = data.secretKey
            ? encryptSecret(data.secretKey.trim())
            : null;
        }
        if (data.webhookSecret !== undefined) {
          patch.encryptedStripeWebhookSecret = data.webhookSecret
            ? encryptSecret(data.webhookSecret.trim())
            : null;
        }
        if (data.priceGrowthMonthly !== undefined) {
          patch.stripePriceGrowthMonthly = data.priceGrowthMonthly?.trim() || null;
        }
        if (data.priceScaleMonthly !== undefined) {
          patch.stripePriceScaleMonthly = data.priceScaleMonthly?.trim() || null;
        }

        await upsertPlatformSettingsPatch(patch);
        invalidateStripeClientCache();
      } else if (data.integration === "resend") {
        if (data.apiKey === undefined && data.fromEmail === undefined) {
          return badRequest(request, "No Resend fields to update");
        }

        const patch = { updatedBy: userId } as Parameters<typeof upsertPlatformSettingsPatch>[0];
        if (data.apiKey !== undefined) {
          patch.encryptedResendApiKey = data.apiKey ? encryptSecret(data.apiKey.trim()) : null;
        }
        if (data.fromEmail !== undefined) {
          patch.resendFromEmail = data.fromEmail?.trim() || null;
        }

        await upsertPlatformSettingsPatch(patch);
      } else if (data.integration === "unsplash") {
        if (data.accessKey === undefined) return badRequest(request, "No Unsplash fields to update");

        await upsertPlatformSettingsPatch({
          updatedBy: userId,
          encryptedUnsplashAccessKey: data.accessKey ? encryptSecret(data.accessKey.trim()) : null,
        });
      } else if (data.integration === "pexels") {
        if (data.apiKey === undefined) return badRequest(request, "No Pexels fields to update");

        await upsertPlatformSettingsPatch({
          updatedBy: userId,
          encryptedPexelsApiKey: data.apiKey ? encryptSecret(data.apiKey.trim()) : null,
        });
      } else {
        const hasCredFields =
          data.apiKey !== undefined ||
          data.accessKeyId !== undefined ||
          data.secretAccessKey !== undefined ||
          data.sessionToken !== undefined ||
          data.region !== undefined ||
          data.model !== undefined;
        const hasGrants = data.organizationIds !== undefined;
        if (!hasCredFields && !hasGrants) {
          return badRequest(request, "No Bedrock fields to update");
        }
        if (hasCredFields) {
          if (isBedrockManagedByEnv()) {
            return withCors(
              request,
              Response.json(
                { error: "Bedrock credentials are managed via server environment variables" },
                { status: 403 },
              ),
            );
          }
          await savePlatformBedrockCredentials({
            apiKey: data.apiKey,
            accessKeyId: data.accessKeyId,
            secretAccessKey: data.secretAccessKey,
            sessionToken: data.sessionToken,
            region: data.region,
            model: data.model,
            updatedBy: userId,
          });
        }
        if (hasGrants) {
          await setPlatformBedrockOrgGrants(data.organizationIds!, userId);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      const status = message.includes("environment variables") ? 403 : 500;
      return withCors(request, Response.json({ error: message }, { status }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  // ── DELETE /api/admin/platform-integrations ─────────────────────────────
  if (path === "/api/admin/platform-integrations" && method === "DELETE") {
    const body = await request.json().catch(() => null);
    const parsed = deleteIntegrationSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    try {
      switch (parsed.data.integration) {
        case "stripe":
          await upsertPlatformSettingsPatch({
            updatedBy: userId,
            encryptedStripeSecretKey: null,
            encryptedStripeWebhookSecret: null,
            stripePriceGrowthMonthly: null,
            stripePriceScaleMonthly: null,
          });
          invalidateStripeClientCache();
          break;
        case "stripe_connect":
          // TODO: call Stripe API to deauthorize connected account before clearing tokens
          await upsertPlatformSettingsPatch({
            updatedBy: userId,
            encryptedStripeConnectAccessToken: null,
            stripeConnectAccountId: null,
            stripeConnectLivemode: null,
            stripeConnectConnectedAt: null,
          });
          invalidateStripeClientCache();
          break;
        case "resend":
          await upsertPlatformSettingsPatch({
            updatedBy: userId,
            encryptedResendApiKey: null,
            resendFromEmail: null,
          });
          break;
        case "unsplash":
          await upsertPlatformSettingsPatch({
            updatedBy: userId,
            encryptedUnsplashAccessKey: null,
          });
          break;
        case "pexels":
          await upsertPlatformSettingsPatch({ updatedBy: userId, encryptedPexelsApiKey: null });
          break;
        case "bedrock":
          await clearStoredPlatformBedrockCredentials(userId);
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clear failed";
      const status = message.includes("environment variables") ? 403 : 500;
      return withCors(request, Response.json({ error: message }, { status }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  // ── DELETE /api/admin/stripe-connect ────────────────────────────────────
  if (path === "/api/admin/stripe-connect" && method === "DELETE") {
    // TODO: call Stripe API to deauthorize connected account before clearing tokens
    await upsertPlatformSettingsPatch({
      updatedBy: userId,
      encryptedStripeConnectAccessToken: null,
      stripeConnectAccountId: null,
      stripeConnectLivemode: null,
      stripeConnectConnectedAt: null,
    });
    invalidateStripeClientCache();
    return withCors(request, Response.json({ ok: true }));
  }

  // ── POST /api/admin/platform-integrations/bedrock-models ────────────────
  if (path === "/api/admin/platform-integrations/bedrock-models" && method === "POST") {
    const body = z
      .object({ apiKey: z.string().min(16).optional() })
      .safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return badRequest(request, body.error.errors[0]?.message ?? "Invalid request");
    }

    const stored = await loadPlatformBedrockCredentials();
    const apiKey = body.data.apiKey?.trim() || stored?.apiKey;
    const credentials = apiKey
      ? { apiKey, region: stored?.region, model: stored?.model }
      : stored;

    if (!credentials) {
      return badRequest(
        request,
        "Paste a Bedrock API key (or save platform credentials) to load models.",
      );
    }

    try {
      const { listBedrockChatModels } = await import("@workspace/ai-providers/bedrock");
      const models = await listBedrockChatModels(credentials);
      return withCors(request, Response.json({ models }));
    } catch (err) {
      const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
      return withCors(
        request,
        Response.json({ error: formatBedrockAuthError(err) }, { status: 502 }),
      );
    }
  }

  // ── POST /api/admin/platform-integrations/bedrock-test ──────────────────
  if (path === "/api/admin/platform-integrations/bedrock-test" && method === "POST") {
    const parsed = z
      .object({
        apiKey: z.string().min(16).optional(),
        accessKeyId: z.string().min(16).optional(),
        secretAccessKey: z.string().min(16).optional(),
        sessionToken: z.string().trim().optional().nullable(),
        region: z.string().trim().min(1).optional(),
        model: z.string().trim().min(1).optional(),
      })
      .safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return badRequest(request, "Invalid request");

    const stored = await loadPlatformBedrockCredentials();
    const apiKey = parsed.data.apiKey?.trim() || stored?.apiKey;
    const accessKeyId = parsed.data.accessKeyId?.trim() || stored?.accessKeyId;
    const secretAccessKey = parsed.data.secretAccessKey?.trim() || stored?.secretAccessKey;
    const sessionToken =
      parsed.data.sessionToken?.trim() || stored?.sessionToken || undefined;
    const region = parsed.data.region?.trim() || stored?.region;
    const model = parsed.data.model?.trim() || stored?.model;

    if (!apiKey && !(accessKeyId && secretAccessKey)) {
      return badRequest(request, "Paste a Bedrock API key (or save one first) to test");
    }

    try {
      const { testBedrockCredentials } = await import("@workspace/ai-providers/bedrock");
      await testBedrockCredentials(
        apiKey
          ? { apiKey, region, model }
          : { accessKeyId, secretAccessKey, sessionToken, region, model },
      );
      return withCors(request, Response.json({ ok: true }));
    } catch (err) {
      const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
      return withCors(
        request,
        Response.json({ ok: false, error: formatBedrockAuthError(err) }),
      );
    }
  }

  return null;
}
