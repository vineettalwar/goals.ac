import { db } from "@workspace/db";
import {
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema";
import type { OrgInviteKind, OrgInvitePrefill } from "@workspace/db/schema";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  generateInviteToken,
  hashInviteToken,
  isWellFormedInviteToken,
} from "@workspace/security/invite-tokens";
import { getOrCreateWorkspaceForOrganization } from "@workspace/billing";
import { normalizePlanId, type PlanId } from "@/lib/billing/usage";
import { normalizeOrgRole, type OrgMemberRole } from "@/lib/org/org-access-shared";
import { logOrgAudit } from "@/lib/org/org-audit";
import { getOrgMembership } from "@/lib/org/org-membership";
import { addOrganizationMember } from "@/lib/org/org-members";

const INVITE_EXPIRY_DAYS = 7;

export interface PendingInviteRow {
  id: number;
  email: string;
  kind: OrgInviteKind;
  organizationId: number | null;
  organizationName: string | null;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  prefill: OrgInvitePrefill | null;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  sendCount: number;
  lastSentAt: Date | null;
}

/** Pass `organizationId` to scope to one org's member invites; omit for the platform-wide admin list (member + firm). */
export async function listPendingInvites(organizationId?: number): Promise<PendingInviteRow[]> {
  const now = new Date();
  const conditions = [isNull(orgInvitesTable.acceptedAt), isNull(orgInvitesTable.revokedAt), gt(orgInvitesTable.expiresAt, now)];
  if (organizationId != null) {
    conditions.push(eq(orgInvitesTable.organizationId, organizationId));
  }

  const rows = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      kind: orgInvitesTable.kind,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      role: orgInvitesTable.role,
      assignedProjectId: orgInvitesTable.assignedProjectId,
      prefill: orgInvitesTable.prefill,
      expiresAt: orgInvitesTable.expiresAt,
      createdAt: orgInvitesTable.createdAt,
      revokedAt: orgInvitesTable.revokedAt,
      sendCount: orgInvitesTable.sendCount,
      lastSentAt: orgInvitesTable.lastSentAt,
    })
    .from(orgInvitesTable)
    // Left join: firm invites have no organization yet.
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(and(...conditions))
    .orderBy(desc(orgInvitesTable.createdAt));

  return rows.map((row) => ({
    ...row,
    role: normalizeOrgRole(row.role) ?? "editor",
  }));
}

export async function revokeOrgInvite(inviteId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const [invite] = await db
    .select({ id: orgInvitesTable.id, acceptedAt: orgInvitesTable.acceptedAt, revokedAt: orgInvitesTable.revokedAt })
    .from(orgInvitesTable)
    .where(eq(orgInvitesTable.id, inviteId))
    .limit(1);

  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.acceptedAt) return { ok: false, error: "Invite already accepted" };
  if (invite.revokedAt) return { ok: false, error: "Invite already revoked" };

  await db
    .update(orgInvitesTable)
    .set({ revokedAt: new Date() })
    .where(eq(orgInvitesTable.id, inviteId));
  return { ok: true };
}

/** Turns "jane@acme.com" into "Acme" — the fallback org name when a firm invite carries no `prefill.orgName`. */
function deriveOrgNameFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? email;
  const label = domain.split(".")[0] ?? domain;
  if (!label) return "New organization";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function createOrgInvite(input: {
  organizationId: number;
  email: string;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  invitedByUserId: number;
}): Promise<
  | { ok: true; inviteId: number; token: string }
  | { ok: false; error: string }
> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [org] = await db
    .select({ id: organizationsTable.id, name: organizationsTable.name })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  const now = new Date();
  const [existingPending] = await db
    .select({ id: orgInvitesTable.id })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.organizationId, input.organizationId),
        eq(orgInvitesTable.email, normalizedEmail),
        isNull(orgInvitesTable.acceptedAt),
        isNull(orgInvitesTable.revokedAt),
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

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      organizationId: input.organizationId,
      email: normalizedEmail,
      role: input.role,
      kind: "member",
      assignedProjectId: input.assignedProjectId,
      token: null,
      tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    .returning({ id: orgInvitesTable.id });

  return { ok: true, inviteId: invite.id, token };
}

/**
 * Firm invites carry no `organizationId` — the org does not exist yet (see D2 in the PRD:
 * `organizations.owner_id` is NOT NULL, so it cannot be created before its owner user is).
 * The org is created at acceptance in `acceptOrgInvite` below.
 */
export async function createFirmInvite(input: {
  email: string;
  prefill: OrgInvitePrefill;
  invitedByUserId: number;
}): Promise<{ ok: true; inviteId: number; token: string } | { ok: false; error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date();

  const [existingPending] = await db
    .select({ id: orgInvitesTable.id })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.email, normalizedEmail),
        eq(orgInvitesTable.kind, "firm"),
        isNull(orgInvitesTable.acceptedAt),
        isNull(orgInvitesTable.revokedAt),
        gt(orgInvitesTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (existingPending) {
    return { ok: false, error: "A pending firm invite already exists for this email" };
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      organizationId: null,
      email: normalizedEmail,
      // Forced at acceptance regardless — a firm invite always makes the accepting user the
      // org's owner (A2). Stored here too so the row reflects the outcome.
      role: "owner",
      kind: "firm",
      prefill: input.prefill,
      token: null,
      tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    .returning({ id: orgInvitesTable.id });

  return { ok: true, inviteId: invite.id, token };
}

export interface ResendableInvite {
  email: string;
  kind: OrgInviteKind;
  organizationName: string | null;
  prefill: OrgInvitePrefill | null;
  invitedByUserId: number;
}

/** Rotates the token (old link stops working), bumps send tracking, and refreshes the expiry. */
export async function resendOrgInvite(
  inviteId: number,
): Promise<{ ok: true; token: string; invite: ResendableInvite } | { ok: false; error: string }> {
  const [invite] = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      kind: orgInvitesTable.kind,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      prefill: orgInvitesTable.prefill,
      invitedByUserId: orgInvitesTable.invitedByUserId,
      acceptedAt: orgInvitesTable.acceptedAt,
      revokedAt: orgInvitesTable.revokedAt,
      sendCount: orgInvitesTable.sendCount,
    })
    .from(orgInvitesTable)
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(eq(orgInvitesTable.id, inviteId))
    .limit(1);

  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.acceptedAt) return { ok: false, error: "Invite already accepted" };
  if (invite.revokedAt) return { ok: false, error: "Invite has been revoked" };

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(orgInvitesTable)
    .set({
      token: null,
      tokenHash,
      expiresAt,
      sendCount: (invite.sendCount ?? 0) + 1,
      lastSentAt: new Date(),
    })
    .where(eq(orgInvitesTable.id, inviteId));

  return {
    ok: true,
    token,
    invite: {
      email: invite.email,
      kind: invite.kind,
      organizationName: invite.organizationName,
      prefill: invite.prefill,
      invitedByUserId: invite.invitedByUserId,
    },
  };
}

export interface InviteDetails {
  id: number;
  email: string;
  role: OrgMemberRole;
  kind: OrgInviteKind;
  organizationId: number | null;
  organizationName: string | null;
  prefill: OrgInvitePrefill | null;
  assignedProjectId: number | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expired: boolean;
  revoked: boolean;
}

/**
 * Looks up an invite by its plaintext token. Lookups go through `token_hash`; rows created
 * before this change have a null `token_hash` and are matched on the legacy plaintext `token`
 * column instead (temporary — those rows expire within 7 days of the migration).
 */
export async function getInviteByToken(token: string): Promise<InviteDetails | null> {
  if (!isWellFormedInviteToken(token)) return null;

  const tokenHash = hashInviteToken(token);
  const selection = {
    id: orgInvitesTable.id,
    email: orgInvitesTable.email,
    role: orgInvitesTable.role,
    kind: orgInvitesTable.kind,
    organizationId: orgInvitesTable.organizationId,
    organizationName: organizationsTable.name,
    prefill: orgInvitesTable.prefill,
    assignedProjectId: orgInvitesTable.assignedProjectId,
    expiresAt: orgInvitesTable.expiresAt,
    acceptedAt: orgInvitesTable.acceptedAt,
    revokedAt: orgInvitesTable.revokedAt,
  };

  let [row] = await db
    .select(selection)
    .from(orgInvitesTable)
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(eq(orgInvitesTable.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    // Legacy fallback for invites issued before token hashing shipped.
    [row] = await db
      .select(selection)
      .from(orgInvitesTable)
      .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
      .where(eq(orgInvitesTable.token, token))
      .limit(1);
  }

  if (!row) return null;

  const now = new Date();
  return {
    id: row.id,
    email: row.email,
    role: normalizeOrgRole(row.role) ?? "editor",
    kind: row.kind,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    prefill: row.prefill,
    assignedProjectId: row.assignedProjectId,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    expired: row.expiresAt < now,
    revoked: row.revokedAt != null,
  };
}

export async function acceptOrgInvite(input: {
  token: string;
  userId: number;
}): Promise<{ ok: true; organizationId: number; kind: OrgInviteKind } | { ok: false; error: string }> {
  const invite = await getInviteByToken(input.token);
  if (!invite) {
    return { ok: false, error: "Invite not found" };
  }
  if (invite.acceptedAt) {
    return { ok: false, error: "Invite has already been accepted" };
  }
  if (invite.revoked) {
    return { ok: false, error: "Invite has been revoked" };
  }
  if (invite.expired) {
    return { ok: false, error: "Invite has expired" };
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, input.userId))
    .limit(1);

  if (!user) {
    return { ok: false, error: "User not found" };
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      ok: false,
      error: "This invite was sent to a different email address. Sign in with the invited email.",
    };
  }

  if (invite.kind === "firm") {
    // A user can belong to only one organization today (getOrgMembership assumes it), so an
    // existing platform user attaches to the new org only if they aren't in one already.
    const existingMembership = await getOrgMembership(input.userId);
    if (existingMembership) {
      return { ok: false, error: "You already belong to an organization" };
    }

    /**
     * Atomically claim the invite before creating anything. Without this, two
     * concurrent accept requests for the same invite (a double-click, two open tabs,
     * a retried network request — all realistic, not exotic) would both pass the
     * `acceptedAt` check read above, since that read happens before either write, and
     * each would create its own organization for the same firm. The conditional
     * UPDATE only lets one request through; the loser gets a clean error instead of
     * a duplicate org silently existing.
     */
    const [claimed] = await db
      .update(orgInvitesTable)
      .set({ acceptedAt: new Date() })
      .where(and(eq(orgInvitesTable.id, invite.id), isNull(orgInvitesTable.acceptedAt)))
      .returning({ id: orgInvitesTable.id });
    if (!claimed) {
      return { ok: false, error: "Invite has already been accepted" };
    }

    const prefill = invite.prefill ?? {};
    const orgName = prefill.orgName?.trim() || deriveOrgNameFromEmail(user.email);
    const plan = normalizePlanId(prefill.plan);

    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: orgName,
        plan,
        vertical: prefill.vertical ?? null,
        ownerId: input.userId,
      })
      .returning({ id: organizationsTable.id });

    await db.insert(organizationMembersTable).values({
      organizationId: org.id,
      userId: input.userId,
      role: "owner",
      assignedProjectId: null,
    });

    await getOrCreateWorkspaceForOrganization({
      organizationId: org.id,
      ownerId: input.userId,
      name: orgName,
    });

    await logOrgAudit({
      organizationId: org.id,
      actorUserId: input.userId,
      action: "invite.accepted",
      resourceType: "invite",
      resourceId: invite.id,
      metadata: { email: invite.email, kind: "firm" },
    });

    return { ok: true, organizationId: org.id, kind: "firm" };
  }

  if (invite.organizationId == null) {
    return { ok: false, error: "Invite is missing an organization" };
  }

  const existingMembership = await getOrgMembership(input.userId);
  if (existingMembership && existingMembership.organizationId !== invite.organizationId) {
    return { ok: false, error: "You already belong to another organization" };
  }

  const result = await addOrganizationMember({
    organizationId: invite.organizationId,
    userId: input.userId,
    role: invite.role,
    assignedProjectId: invite.assignedProjectId,
  });

  if (!result.ok) {
    return result;
  }

  await db
    .update(orgInvitesTable)
    .set({ acceptedAt: new Date() })
    .where(eq(orgInvitesTable.id, invite.id));

  return { ok: true, organizationId: invite.organizationId, kind: "member" };
}
