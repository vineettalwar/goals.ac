import { withCors } from "@workspace/cf-edge/cors";
import { getPlatformSettings } from "@workspace/platform-admin";
import {
  upsertPlanQuotaLimits,
  loadPlanQuotaLimits,
  getOrCreateWorkspaceForOrganization,
  invalidatePlatformGatesCache,
  type PlanId,
} from "@workspace/billing";
import { db } from "./db";
import {
  companiesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  badRequest,
  clientIp,
  conflict,
  getOrgMembership,
  logOrgAudit,
  notFound,
  upsertPlatformSettingsPatch,
  type PlatformSettingsPatch,
} from "./admin-helpers";

// ── Domain helpers ────────────────────────────────────────────────────────────

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
    plan: z.enum(["starter", "growth", "scale"]).default("starter"),
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
  plan: z.enum(["starter", "growth", "scale"]),
  force: z.boolean().optional(),
});

const planQuotaUpdateSchema = z.object({
  planId: z.enum(["starter", "growth", "scale"]),
  limits: z.object({
    articles: z.number().int().min(0).nullable(),
    roadmaps: z.number().int().min(0).nullable(),
    sites: z.number().int().min(0).nullable(),
  }),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAdminOrgRoutes(
  request: Request,
  path: string,
  userId: number,
  userRole: string | null | undefined,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  // ── PATCH /api/admin/platform-settings ──────────────────────────────────
  if (path === "/api/admin/platform-settings" && method === "PATCH") {
    const body = await request.json().catch(() => null);
    const parsed = platformSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request", parsed.error.flatten());

    const settings = await updatePlatformSettings({ ...parsed.data, updatedBy: userId });
    invalidatePlatformGatesCache();
    return withCors(request, Response.json(settings));
  }

  // ── POST /api/admin/organizations ───────────────────────────────────────
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

  // ── POST /api/admin/organizations/suspend ───────────────────────────────
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

  // ── DELETE /api/admin/organizations/suspend ─────────────────────────────
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

  // ── PATCH /api/admin/organizations/plan ────────────────────────────────
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
        metadata: {
          previousPlan: result.previousPlan,
          newPlan: parsed.data.plan,
          ...(parsed.data.force ? { force: true } : {}),
        },
        ip: clientIp(request),
      });
    }

    return withCors(
      request,
      Response.json({ ok: true, plan: parsed.data.plan, previousPlan: result.previousPlan }),
    );
  }

  // ── PATCH /api/admin/plan-quotas ────────────────────────────────────────
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

  return null;
}
