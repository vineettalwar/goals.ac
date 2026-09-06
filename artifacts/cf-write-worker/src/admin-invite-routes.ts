import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { badRequest, clientIp, logOrgAudit } from "./admin-helpers";

// ── Domain helpers ────────────────────────────────────────────────────────────

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

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createInviteBodySchema = z.object({
  email: z.string().email(),
  organizationId: z.number().int().positive(),
  role: z.enum(["owner", "site_admin", "editor", "viewer"]),
  assignedProjectId: z.number().int().positive().nullable().optional(),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAdminInviteRoutes(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  // ── POST /api/admin/invites ────────────────────────────────────────────
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

  // ── DELETE /api/admin/invites/:id ──────────────────────────────────────
  const inviteDeleteMatch = path.match(/^\/api\/admin\/invites\/(\d+)$/);
  if (inviteDeleteMatch && method === "DELETE") {
    const inviteId = Number.parseInt(inviteDeleteMatch[1]!, 10);
    if (!Number.isFinite(inviteId) || inviteId <= 0) return badRequest(request, "Invalid invite id");

    const result = await revokeOrgInvite(inviteId);
    if (!result.ok) return badRequest(request, result.error);

    return withCors(request, Response.json({ revoked: true }));
  }

  return null;
}
