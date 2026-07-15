import { withCors } from "@workspace/cf-edge/cors";
import { isPlatformAdmin, getPlatformSettings } from "@workspace/platform-admin";
import {
  upsertPlanQuotaLimits,
  loadPlanQuotaLimits,
  invalidatePlatformGatesCache,
  getOrCreateWorkspaceForOrganization,
  invalidateStripeClientCache,
  type PlanId,
} from "@workspace/billing";
import { db } from "@workspace/db";
import {
  companiesTable,
  orgAuditLogTable,
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  platformSettingsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import {
  buildSessionCookie,
  requestUsesSecureCookies,
  type SessionTokenPayload,
} from "@workspace/cf-edge/session-cookie";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

type PlatformSettingsPatch = Partial<typeof platformSettingsTable.$inferInsert>;

function forbidden(request: Request) {
  return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
}

function badRequest(request: Request, message: string, details?: unknown) {
  return withCors(
    request,
    Response.json({ error: message, ...(details ? { details } : {}) }, { status: 400 }),
  );
}

function notFound(request: Request, message = "Not found") {
  return withCors(request, Response.json({ error: message }, { status: 404 }));
}

function conflict(request: Request, message: string, code?: string) {
  return withCors(
    request,
    Response.json({ error: message, ...(code ? { code } : {}) }, { status: 409 }),
  );
}

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

function jsonWithCookie(
  request: Request,
  body: unknown,
  cookie: string,
  status = 200,
): Response {
  return withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }),
  );
}

async function upsertPlatformSettingsPatch(patch: PlatformSettingsPatch): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({ target: platformSettingsTable.id, set: patch });
}

// ── Inline org helpers (TODO: promote to @workspace/platform-admin) ───────────

async function logOrgAudit(input: {
  organizationId: number;
  actorUserId: number | null;
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  await db.insert(orgAuditLogTable).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId != null ? String(input.resourceId) : null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
}

async function getOrgMembership(userId: number) {
  const [row] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);
  return row ?? null;
}

async function suspendOrganization(input: { organizationId: number; reason?: string }) {
  await db
    .update(organizationsTable)
    .set({ suspendedAt: new Date(), suspendedReason: input.reason ?? null })
    .where(eq(organizationsTable.id, input.organizationId));
}

async function unsuspendOrganization(organizationId: number) {
  await db
    .update(organizationsTable)
    .set({ suspendedAt: null, suspendedReason: null })
    .where(eq(organizationsTable.id, organizationId));
}

async function updateOrganizationPlan(input: { organizationId: number; plan: PlanId }) {
  const [org] = await db
    .select({ plan: organizationsTable.plan })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);

  if (!org) return { ok: false as const, error: "Organization not found" };

  const previousPlan = (org.plan as PlanId) ?? "starter";

  await db
    .update(organizationsTable)
    .set({ plan: input.plan })
    .where(eq(organizationsTable.id, input.organizationId));

  const members = await db
    .select({ userId: organizationMembersTable.userId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.organizationId, input.organizationId));

  if (members.length > 0) {
    await db
      .update(usersTable)
      .set({ plan: input.plan })
      .where(inArray(usersTable.id, members.map((m) => m.userId)));
  }

  return { ok: true as const, previousPlan };
}

async function updatePlatformSettings(
  input: Partial<{
    platformEnabled: boolean;
    aiGenerationEnabled: boolean;
    maintenanceMessage: string | null;
    signupsEnabled: boolean;
    stripeBillingEnabled: boolean;
    googleIntegrationsEnabled: boolean;
    bingWebmasterEnabled: boolean;
    socialPublishingEnabled: boolean;
    emailEnabled: boolean;
  }> & { updatedBy: number },
) {
  const existing = await getPlatformSettings();
  const next = {
    platformEnabled: input.platformEnabled ?? existing.platformEnabled,
    aiGenerationEnabled: input.aiGenerationEnabled ?? existing.aiGenerationEnabled,
    maintenanceMessage:
      input.maintenanceMessage !== undefined
        ? input.maintenanceMessage
        : existing.maintenanceMessage,
    signupsEnabled: input.signupsEnabled ?? existing.signupsEnabled,
    stripeBillingEnabled: input.stripeBillingEnabled ?? existing.stripeBillingEnabled,
    googleIntegrationsEnabled:
      input.googleIntegrationsEnabled ?? existing.googleIntegrationsEnabled,
    bingWebmasterEnabled: input.bingWebmasterEnabled ?? existing.bingWebmasterEnabled,
    socialPublishingEnabled: input.socialPublishingEnabled ?? existing.socialPublishingEnabled,
    emailEnabled: input.emailEnabled ?? existing.emailEnabled,
  };
  await upsertPlatformSettingsPatch({ ...next, updatedBy: input.updatedBy });
  return next;
}

async function revokeOrgInvite(
  inviteId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [invite] = await db
    .select({ id: orgInvitesTable.id, acceptedAt: orgInvitesTable.acceptedAt })
    .from(orgInvitesTable)
    .where(eq(orgInvitesTable.id, inviteId))
    .limit(1);

  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.acceptedAt) return { ok: false, error: "Invite already accepted" };

  await db.delete(orgInvitesTable).where(eq(orgInvitesTable.id, inviteId));
  return { ok: true };
}

async function createOrgInvite(input: {
  organizationId: number;
  email: string;
  role: string;
  assignedProjectId: number | null;
  invitedByUserId: number;
}): Promise<{ ok: true; inviteId: number; token: string } | { ok: false; error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [org] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);
  if (!org) return { ok: false, error: "Organization not found" };

  const now = new Date();
  const [existingPending] = await db
    .select({ id: orgInvitesTable.id })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.organizationId, input.organizationId),
        eq(orgInvitesTable.email, normalizedEmail),
        isNull(orgInvitesTable.acceptedAt),
        gt(orgInvitesTable.expiresAt, now),
      ),
    )
    .limit(1);
  if (existingPending) {
    return { ok: false, error: "A pending invite already exists for this email and organization" };
  }

  const [existingMember] = await db
    .select({ id: organizationMembersTable.id })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(usersTable.email, normalizedEmail),
      ),
    )
    .limit(1);
  if (existingMember) {
    return { ok: false, error: "User is already a member of this organization" };
  }

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      organizationId: input.organizationId,
      email: normalizedEmail,
      role: input.role,
      assignedProjectId: input.assignedProjectId,
      token,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    .returning({ id: orgInvitesTable.id });

  return { ok: true, inviteId: invite.id, token };
}

async function onboardOrganizationAsAdmin(input: {
  ownerUserId: number;
  organizationName: string;
  plan: PlanId;
  company?: {
    name: string;
    websiteUrl: string;
    industry: string;
    description: string;
    targetAudience: string;
  };
  firstProject?: { name: string; url: string };
}): Promise<
  | { ok: true; organizationId: number; companyId: number | null; projectId: number | null }
  | { ok: false; error: string }
> {
  const existingMembership = await getOrgMembership(input.ownerUserId);
  if (existingMembership) return { ok: false, error: "User already belongs to an organization" };

  let companyId: number | null = null;
  if (input.company) {
    const [company] = await db
      .insert(companiesTable)
      .values({
        userId: input.ownerUserId,
        name: input.company.name,
        websiteUrl: input.company.websiteUrl,
        industry: input.company.industry,
        description: input.company.description,
        targetAudience: input.company.targetAudience,
        onboardingComplete: true,
      })
      .returning({ id: companiesTable.id });
    companyId = company.id;
  }

  const [org] = await db
    .insert(organizationsTable)
    .values({ name: input.organizationName, plan: input.plan, ownerId: input.ownerUserId, companyId })
    .returning({ id: organizationsTable.id });

  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId: input.ownerUserId,
    role: "owner",
    assignedProjectId: null,
  });

  await getOrCreateWorkspaceForOrganization({
    organizationId: org.id,
    ownerId: input.ownerUserId,
    name: input.organizationName,
  });

  await db.update(usersTable).set({ plan: input.plan }).where(eq(usersTable.id, input.ownerUserId));

  let projectId: number | null = null;
  if (input.firstProject) {
    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: input.ownerUserId,
        organizationId: org.id,
        name: input.firstProject.name,
        url: input.firstProject.url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning({ id: websiteProjectsTable.id });
    projectId = project.id;
  }

  return { ok: true, organizationId: org.id, companyId, projectId };
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const platformSettingsUpdateSchema = z.object({
  platformEnabled: z.boolean().optional(),
  aiGenerationEnabled: z.boolean().optional(),
  maintenanceMessage: z.string().nullable().optional(),
  signupsEnabled: z.boolean().optional(),
  stripeBillingEnabled: z.boolean().optional(),
  googleIntegrationsEnabled: z.boolean().optional(),
  bingWebmasterEnabled: z.boolean().optional(),
  socialPublishingEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

const createOrgBodySchema = z
  .object({
    ownerEmail: z.string().email(),
    ownerName: z.string().min(1).optional(),
    createUserIfMissing: z.boolean().optional().default(false),
    temporaryPassword: z.string().min(8).optional(),
    organizationName: z.string().min(1),
    plan: z.literal("starter").default("starter"),
    company: z
      .object({
        name: z.string().min(1),
        websiteUrl: z.string().url(),
        industry: z.string().min(1).default("Other"),
        description: z.string().min(5).default("Onboarded by platform admin."),
        targetAudience: z.string().min(5).default("General audience."),
      })
      .optional(),
    firstProject: z.object({ name: z.string().min(1), url: z.string().url() }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.createUserIfMissing) {
      if (!data.ownerName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner name is required when creating a new user",
          path: ["ownerName"],
        });
      }
      if (!data.temporaryPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Temporary password is required when creating a new user",
          path: ["temporaryPassword"],
        });
      }
    }
  });

const suspendSchema = z.object({
  organizationId: z.number().int().positive(),
  reason: z.string().optional(),
});

const updatePlanSchema = z.object({
  organizationId: z.number().int().positive(),
  plan: z.literal("starter"),
  force: z.boolean().optional(),
});

const createInviteBodySchema = z.object({
  email: z.string().email(),
  organizationId: z.number().int().positive(),
  role: z.enum(["owner", "site_admin", "editor", "viewer"]),
  assignedProjectId: z.number().int().positive().nullable().optional(),
});

const planQuotaUpdateSchema = z.object({
  planId: z.enum(["starter", "growth", "scale"]),
  limits: z.object({
    articles: z.number().int().min(0).nullable(),
    roadmaps: z.number().int().min(0).nullable(),
    sites: z.number().int().min(0).nullable(),
  }),
});

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
]);

const deleteIntegrationSchema = z.object({
  integration: z.enum(["stripe", "stripe_connect", "resend", "unsplash", "pexels"]),
});

const impersonateBodySchema = z.union([
  z.object({ userId: z.number().int().positive() }),
  z.object({ organizationId: z.number().int().positive() }),
]);

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleAdminWrite(
  request: Request,
  path: string,
  userRole: string | null | undefined,
  session: SessionClaims,
  authSecret: string,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin")) return null;
  if (!isPlatformAdmin(userRole)) return forbidden(request);

  const userId = Number.parseInt(session.id ?? "", 10);
  if (!Number.isFinite(userId)) return forbidden(request);

  const method = request.method;
  const url = new URL(request.url);

  // ── PATCH /api/admin/platform-settings ────────────────────────────────────
  if (path === "/api/admin/platform-settings" && method === "PATCH") {
    const body = await request.json().catch(() => null);
    const parsed = platformSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    const settings = await updatePlatformSettings({ ...parsed.data, updatedBy: userId });
    invalidatePlatformGatesCache();
    return withCors(request, Response.json(settings));
  }

  // ── POST /api/admin/organizations ─────────────────────────────────────────
  if (path === "/api/admin/organizations" && method === "POST") {
    const body = await request.json().catch(() => null);
    const parsed = createOrgBodySchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    const data = parsed.data;
    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, data.ownerEmail))
      .limit(1);

    let ownerUserId = existingUser?.id;

    if (!ownerUserId) {
      if (!data.createUserIfMissing) {
        return notFound(
          request,
          "User not found — enable createUserIfMissing or ask them to sign up first",
        );
      }
      const passwordHash = await bcrypt.hash(data.temporaryPassword!, 10);
      const [newUser] = await db
        .insert(usersTable)
        .values({ name: data.ownerName!, email: data.ownerEmail, passwordHash, plan: data.plan })
        .returning({ id: usersTable.id });
      ownerUserId = newUser.id;
    }

    const result = await onboardOrganizationAsAdmin({
      ownerUserId,
      organizationName: data.organizationName,
      plan: data.plan as PlanId,
      company: data.company,
      firstProject: data.firstProject,
    });

    if (!result.ok) return badRequest(request, result.error);

    return withCors(
      request,
      Response.json(
        {
          organizationId: result.organizationId,
          companyId: result.companyId,
          projectId: result.projectId,
          ownerUserId,
        },
        { status: 201 },
      ),
    );
  }

  // ── POST /api/admin/organizations/suspend ─────────────────────────────────
  if (path === "/api/admin/organizations/suspend" && method === "POST") {
    const body = await request.json().catch(() => null);
    const parsed = suspendSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    await suspendOrganization({ organizationId: parsed.data.organizationId, reason: parsed.data.reason });

    await logOrgAudit({
      organizationId: parsed.data.organizationId,
      actorUserId: userId,
      action: "org.suspended",
      metadata: { reason: parsed.data.reason },
      ip: clientIp(request),
    });

    return withCors(request, Response.json({ ok: true }));
  }

  // ── DELETE /api/admin/organizations/suspend ────────────────────────────────
  if (path === "/api/admin/organizations/suspend" && method === "DELETE") {
    const organizationId = Number(url.searchParams.get("organizationId"));
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      return badRequest(request, "organizationId required");
    }

    await unsuspendOrganization(organizationId);

    await logOrgAudit({
      organizationId,
      actorUserId: userId,
      action: "org.unsuspended",
      ip: clientIp(request),
    });

    return withCors(request, Response.json({ ok: true }));
  }

  // ── PATCH /api/admin/organizations/plan ───────────────────────────────────
  if (path === "/api/admin/organizations/plan" && method === "PATCH") {
    const body = await request.json().catch(() => null);
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    if (!parsed.data.force) {
      const [org] = await db
        .select({
          stripeSubscriptionId: organizationsTable.stripeSubscriptionId,
          stripeCustomerId: organizationsTable.stripeCustomerId,
        })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, parsed.data.organizationId))
        .limit(1);

      if (org?.stripeSubscriptionId || org?.stripeCustomerId) {
        return conflict(
          request,
          "Organization has Stripe billing on file. Sync via the customer portal or pass force: true after canceling in Stripe.",
          "stripe_subscription_active",
        );
      }
    }

    const result = await updateOrganizationPlan({
      organizationId: parsed.data.organizationId,
      plan: parsed.data.plan as PlanId,
    });

    if (!result.ok) return badRequest(request, result.error);

    if (result.previousPlan !== parsed.data.plan) {
      await logOrgAudit({
        organizationId: parsed.data.organizationId,
        actorUserId: userId,
        action: "org.plan_changed",
        metadata: { previousPlan: result.previousPlan, newPlan: parsed.data.plan },
        ip: clientIp(request),
      });
    }

    return withCors(
      request,
      Response.json({ ok: true, plan: parsed.data.plan, previousPlan: result.previousPlan }),
    );
  }

  // ── POST /api/admin/invites ────────────────────────────────────────────────
  if (path === "/api/admin/invites" && method === "POST") {
    const body = await request.json().catch(() => null);
    const parsed = createInviteBodySchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    const data = parsed.data;
    const result = await createOrgInvite({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role,
      assignedProjectId: data.assignedProjectId ?? null,
      invitedByUserId: userId,
    });

    if (!result.ok) return badRequest(request, result.error);

    await logOrgAudit({
      organizationId: data.organizationId,
      actorUserId: userId,
      action: "invite.sent",
      resourceType: "invite",
      resourceId: result.inviteId,
      metadata: { email: data.email, role: data.role, emailSent: false },
      ip: clientIp(request),
    });

    return withCors(
      request,
      Response.json(
        {
          inviteId: result.inviteId,
          emailSent: false,
          // TODO: wire email sending (requires sendEmail from marketing-persona-app email util)
        },
        { status: 201 },
      ),
    );
  }

  // ── DELETE /api/admin/invites/:id ─────────────────────────────────────────
  const inviteDeleteMatch = path.match(/^\/api\/admin\/invites\/(\d+)$/);
  if (inviteDeleteMatch && method === "DELETE") {
    const inviteId = Number.parseInt(inviteDeleteMatch[1]!, 10);
    if (!Number.isFinite(inviteId) || inviteId <= 0) return badRequest(request, "Invalid invite id");

    const result = await revokeOrgInvite(inviteId);
    if (!result.ok) return badRequest(request, result.error);

    return withCors(request, Response.json({ revoked: true }));
  }

  // ── PATCH /api/admin/plan-quotas ──────────────────────────────────────────
  if (path === "/api/admin/plan-quotas" && method === "PATCH") {
    const body = await request.json().catch(() => null);
    const parsed = planQuotaUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    await upsertPlanQuotaLimits({
      planId: parsed.data.planId as PlanId,
      limits: parsed.data.limits,
      updatedBy: userId,
    });

    const limits = await loadPlanQuotaLimits();
    return withCors(request, Response.json({ limits }));
  }

  // ── PATCH /api/admin/platform-integrations ────────────────────────────────
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

        const patch: PlatformSettingsPatch = { updatedBy: userId };
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

        const patch: PlatformSettingsPatch = { updatedBy: userId };
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
      } else {
        // pexels
        if (data.apiKey === undefined) return badRequest(request, "No Pexels fields to update");

        await upsertPlatformSettingsPatch({
          updatedBy: userId,
          encryptedPexelsApiKey: data.apiKey ? encryptSecret(data.apiKey.trim()) : null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      return withCors(request, Response.json({ error: message }, { status: 500 }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  // ── DELETE /api/admin/platform-integrations ────────────────────────────────
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
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clear failed";
      return withCors(request, Response.json({ error: message }, { status: 500 }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  // ── DELETE /api/admin/stripe-connect ──────────────────────────────────────
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

  // ── POST /api/admin/impersonate ───────────────────────────────────────────
  if (path === "/api/admin/impersonate" && method === "POST") {
    if (userRole !== "super_admin") return forbidden(request);

    const body = await request.json().catch(() => null);
    const parsed = impersonateBodySchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request");

    const secure = requestUsesSecureCookies(request);
    const [adminUser] = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if ("organizationId" in parsed.data) {
      const organizationId = parsed.data.organizationId;

      const [org] = await db
        .select({
          ownerId: organizationsTable.ownerId,
          name: organizationsTable.name,
          companyId: organizationsTable.companyId,
        })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, organizationId))
        .limit(1);

      if (!org) return notFound(request, "Organization not found");

      const [target] = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(eq(usersTable.id, org.ownerId))
        .limit(1);

      if (!target || target.role === "super_admin" || target.role === "admin") {
        const supportPayload: SessionTokenPayload = {
          id: String(userId),
          email: adminUser?.email ?? session.email ?? "",
          name: adminUser?.name ?? session.name ?? null,
          role: userRole,
          supportOrganizationId: organizationId,
          supportOrganizationName: org.name,
          organizationId,
          orgRole: "owner",
        };
        const cookie = await buildSessionCookie(supportPayload, authSecret, secure);

        await logOrgAudit({
          organizationId,
          actorUserId: userId,
          action: "admin.org_support_started",
          resourceType: "organization",
          resourceId: organizationId,
          ip: clientIp(request),
        });

        return jsonWithCookie(
          request,
          {
            ok: true,
            supportOrganizationId: organizationId,
            supportOrganizationName: org.name,
            companyId: org.companyId,
          },
          cookie,
        );
      }

      const impersonationPayload: SessionTokenPayload = {
        id: String(target.id),
        email: target.email,
        name: target.name,
        role: target.role ?? "user",
        impersonatorId: String(userId),
        impersonatorRole: userRole,
        impersonatorEmail: adminUser?.email ?? session.email ?? null,
        impersonatorName: adminUser?.name ?? null,
      };

      const cookie = await buildSessionCookie(impersonationPayload, authSecret, secure);

      await logOrgAudit({
        organizationId,
        actorUserId: userId,
        action: "admin.impersonation_started",
        resourceType: "user",
        resourceId: target.id,
        metadata: { targetEmail: target.email, viaOrganizationId: organizationId },
        ip: clientIp(request),
      });

      return new Response(
        JSON.stringify({
          ok: true,
          impersonateUserId: String(target.id),
          impersonator: { id: String(userId), email: adminUser?.email, role: userRole },
          target: { id: String(target.id), email: target.email, name: target.name },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Set-Cookie": cookie,
          },
        },
      );
    }

    // userId-based impersonation
    const targetUserId = parsed.data.userId;

    const [target] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .limit(1);

    if (!target) return notFound(request, "User not found");
    if (target.role === "super_admin" || target.role === "admin") return forbidden(request);
    if (target.id === userId) return badRequest(request, "Cannot impersonate yourself");

    const impersonationPayload: SessionTokenPayload = {
      id: String(target.id),
      email: target.email,
      name: target.name,
      role: target.role ?? "user",
      impersonatorId: String(userId),
      impersonatorRole: userRole,
      impersonatorEmail: adminUser?.email ?? session.email ?? null,
      impersonatorName: adminUser?.name ?? null,
    };

    const cookie = await buildSessionCookie(impersonationPayload, authSecret, secure);

    const [membership] = await db
      .select({ organizationId: organizationMembersTable.organizationId })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.userId, target.id))
      .limit(1);

    if (membership) {
      await logOrgAudit({
        organizationId: membership.organizationId,
        actorUserId: userId,
        action: "admin.impersonation_started",
        resourceType: "user",
        resourceId: target.id,
        metadata: { targetEmail: target.email },
        ip: clientIp(request),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        impersonateUserId: String(target.id),
        impersonator: { id: String(userId), email: adminUser?.email, role: userRole },
        target: { id: String(target.id), email: target.email, name: target.name },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Set-Cookie": cookie,
        },
      },
    );
  }

  // ── DELETE /api/admin/impersonate ─────────────────────────────────────────
  if (path === "/api/admin/impersonate" && method === "DELETE") {
    const { impersonatorId, supportOrganizationId, supportOrganizationName } = session;
    const secure = requestUsesSecureCookies(request);

    if (supportOrganizationId) {
      const adminId = impersonatorId ? Number.parseInt(impersonatorId, 10) : userId;
      await logOrgAudit({
        organizationId: supportOrganizationId,
        actorUserId: adminId,
        action: "admin.org_support_stopped",
        resourceType: "organization",
        resourceId: supportOrganizationId,
        ip: clientIp(request),
      });
      return withCors(request, Response.json({ ok: true, stopSupportOrganization: true }));
    }

    if (!impersonatorId) return badRequest(request, "Not impersonating");

    // Restore the original admin session
    const adminId = Number.parseInt(impersonatorId, 10);
    const [adminUser] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .limit(1);

    if (!adminUser) return badRequest(request, "Admin user not found");

    const [membership] = await db
      .select({ organizationId: organizationMembersTable.organizationId })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.userId, userId))
      .limit(1);

    if (membership) {
      await logOrgAudit({
        organizationId: membership.organizationId,
        actorUserId: adminId,
        action: "admin.impersonation_stopped",
        resourceType: "user",
        resourceId: userId,
        metadata: { targetEmail: session.email },
        ip: clientIp(request),
      });
    }

    const restoredPayload: SessionTokenPayload = {
      id: String(adminUser.id),
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role ?? session.impersonatorRole ?? "admin",
    };

    const cookie = await buildSessionCookie(restoredPayload, authSecret, secure);

    return new Response(JSON.stringify({ ok: true, stopImpersonation: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": cookie,
      },
    });
  }

  return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
}
