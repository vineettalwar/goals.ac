import { db } from "./db";
import {
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { toIsoString } from "./dates";
import { addOrganizationMember } from "./org-mutations";
import type { OrgMemberRole } from "./users";

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
}

const INVITE_EXPIRY_DAYS = 7;

export interface PendingInviteRow {
  id: number;
  email: string;
  organizationId: number;
  organizationName: string;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  expiresAt: string;
  createdAt: string;
}

export async function listPendingInvites(organizationId?: number): Promise<PendingInviteRow[]> {
  const now = new Date();
  const conditions = [isNull(orgInvitesTable.acceptedAt), gt(orgInvitesTable.expiresAt, now)];
  if (organizationId != null) {
    conditions.push(eq(orgInvitesTable.organizationId, organizationId));
  }

  const rows = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      role: orgInvitesTable.role,
      assignedProjectId: orgInvitesTable.assignedProjectId,
      expiresAt: orgInvitesTable.expiresAt,
      createdAt: orgInvitesTable.createdAt,
    })
    .from(orgInvitesTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(and(...conditions))
    .orderBy(desc(orgInvitesTable.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    role: normalizeOrgRole(row.role) ?? "editor",
    assignedProjectId: row.assignedProjectId,
    expiresAt: toIsoString(row.expiresAt),
    createdAt: toIsoString(row.createdAt),
  }));
}

export async function createOrgInvite(input: {
  organizationId: number;
  email: string;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  invitedByUserId: number;
}): Promise<{ ok: true; inviteId: number; token: string } | { ok: false; error: string }> {
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

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

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

export interface InviteDetails {
  id: number;
  email: string;
  role: OrgMemberRole;
  organizationId: number;
  organizationName: string;
  assignedProjectId: number | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  expired: boolean;
}

export async function getInviteByToken(token: string): Promise<InviteDetails | null> {
  const [row] = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      role: orgInvitesTable.role,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      assignedProjectId: orgInvitesTable.assignedProjectId,
      expiresAt: orgInvitesTable.expiresAt,
      acceptedAt: orgInvitesTable.acceptedAt,
    })
    .from(orgInvitesTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(eq(orgInvitesTable.token, token))
    .limit(1);

  if (!row) return null;

  const now = new Date();
  return {
    id: row.id,
    email: row.email,
    role: normalizeOrgRole(row.role) ?? "editor",
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    assignedProjectId: row.assignedProjectId,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    expired: row.expiresAt < now,
  };
}

export async function acceptOrgInvite(input: {
  token: string;
  userId: number;
}): Promise<{ ok: true; organizationId: number } | { ok: false; error: string }> {
  const invite = await getInviteByToken(input.token);
  if (!invite) {
    return { ok: false, error: "Invite not found" };
  }
  if (invite.acceptedAt) {
    return { ok: false, error: "Invite has already been accepted" };
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

  const [existingMembership] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, input.userId))
    .limit(1);

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

  return { ok: true, organizationId: invite.organizationId };
}

export async function revokeOrgInvite(
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
