import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashInviteToken } from "@workspace/security/invite-tokens";

/**
 * Minimal fluent stand-in for a drizzle query builder. Every chain method is a spy that
 * returns the same object, so calls can be composed in any order
 * (`.from().leftJoin().where().limit()`, or `.values()` awaited directly with no
 * `.returning()`), and the object itself is thenable so `await db.select(...)....limit(1)`
 * resolves to whatever result was queued for that call.
 */
function chain<T>(result: T) {
  const obj: Record<string, unknown> = {};
  for (const method of ["from", "leftJoin", "innerJoin", "where", "limit", "orderBy", "values", "set"]) {
    obj[method] = vi.fn(() => obj);
  }
  obj.returning = vi.fn(() => Promise.resolve(result));
  obj.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T>;
}

const dbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@workspace/db", () => ({
  db: dbMock,
  ilikeCompat: vi.fn(),
}));

vi.mock("@workspace/billing", () => ({
  getOrCreateWorkspaceForOrganization: vi.fn().mockResolvedValue(undefined),
  getBalance: vi.fn(),
  getWorkspaceIdForOrganization: vi.fn(),
  resolvePlanProjectQuota: vi.fn(),
}));

vi.mock("@/lib/org/org-audit", () => ({
  logOrgAudit: vi.fn().mockResolvedValue(undefined),
  listOrgAuditLog: vi.fn(),
}));

// The "@/..." alias isn't wired into the root vitest config (it's per-app, and several apps
// reuse the prefix for different src roots), so these two are re-pointed at their real,
// DB-free implementations by relative path rather than mocked away — the invite logic under
// test genuinely depends on their real behavior (role normalization, plan normalization).
vi.mock("@/lib/org/org-access-shared", () => import("./org-access-shared"));
vi.mock("@/lib/billing/usage", async () => {
  const plans = await import("../billing/plans");
  return { ...plans, getOrganizationProjectCount: vi.fn() };
});

const { createOrgInvite, createFirmInvite, acceptOrgInvite, getInviteByToken } = await import(
  "./org-access"
);
const { organizationsTable, organizationMembersTable, usersTable, orgInvitesTable } = await import(
  "@workspace/db/schema"
);

function selectOnce<T>(result: T) {
  dbMock.select.mockReturnValueOnce(chain(result));
}

function insertOnce<T>(result: T) {
  const built = chain(result);
  dbMock.insert.mockReturnValueOnce(built);
  return built;
}

/** `result` is what `.returning()` yields; defaults to a claimed row so the atomic
 *  accept-invite claim (`UPDATE ... RETURNING id`) succeeds unless a test deliberately
 *  wants to simulate losing the claim race by passing `[]`. */
function updateOnce<T = { id: number }[]>(result?: T) {
  const built = chain(result ?? ([{ id: 1 }] as unknown as T));
  dbMock.update.mockReturnValueOnce(built);
  return built;
}

const NOW = new Date("2026-09-01T12:00:00Z");
const IN_7_DAYS = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
const YESTERDAY = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

interface InviteRowOverrides {
  kind?: "member" | "firm";
  organizationId?: number | null;
  organizationName?: string | null;
  prefill?: Record<string, unknown> | null;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  expiresAt?: Date;
  role?: string;
  email?: string;
}

function inviteRow(overrides: InviteRowOverrides = {}) {
  return {
    id: 7,
    email: overrides.email ?? "owner@newfirm.com",
    role: overrides.role ?? "owner",
    kind: overrides.kind ?? "firm",
    organizationId: overrides.organizationId ?? null,
    organizationName: overrides.organizationName ?? null,
    prefill: overrides.prefill ?? { orgName: "New Firm", vertical: "law", plan: "growth" },
    assignedProjectId: null,
    expiresAt: overrides.expiresAt ?? IN_7_DAYS,
    acceptedAt: overrides.acceptedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe("token hashing round trip", () => {
  it("createOrgInvite (member) stores only the hash — token column is null", async () => {
    selectOnce([{ id: 1, name: "Acme" }]); // org lookup
    selectOnce([]); // existing pending invite
    selectOnce([]); // existing member
    const insertCall = insertOnce([{ id: 42 }]);

    const result = await createOrgInvite({
      organizationId: 1,
      email: "new.member@acme.com",
      role: "editor",
      assignedProjectId: 5,
      invitedByUserId: 9,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    expect(dbMock.insert).toHaveBeenCalledWith(orgInvitesTable);
    const values = insertCall.values.mock.calls[0][0];
    expect(values.token).toBeNull();
    expect(values.tokenHash).toBe(hashInviteToken(result.token));
    expect(values.kind).toBe("member");
  });

  it("createFirmInvite stores only the hash — token column is null", async () => {
    selectOnce([]); // no existing pending firm invite
    const insertCall = insertOnce([{ id: 99 }]);

    const result = await createFirmInvite({
      email: "owner@newfirm.com",
      prefill: { orgName: "New Firm", vertical: "law" },
      invitedByUserId: 9,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    const values = insertCall.values.mock.calls[0][0];
    expect(values.token).toBeNull();
    expect(values.tokenHash).toBe(hashInviteToken(result.token));
    expect(values.organizationId).toBeNull();
    expect(values.kind).toBe("firm");
  });
});

describe("getInviteByToken", () => {
  it("rejects a malformed token before it reaches the database", async () => {
    const invite = await getInviteByToken("not a real token");
    expect(invite).toBeNull();
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});

describe("acceptOrgInvite — single-use, revoked, expired", () => {
  const validToken = "A".repeat(43); // well-formed per isWellFormedInviteToken

  it("rejects an invite that was already accepted (single-use)", async () => {
    selectOnce([inviteRow({ acceptedAt: YESTERDAY })]);

    const result = await acceptOrgInvite({ token: validToken, userId: 1 });

    expect(result).toEqual({ ok: false, error: "Invite has already been accepted" });
    expect(dbMock.select).toHaveBeenCalledTimes(1); // never got to looking up the user
  });

  it("rejects a revoked invite", async () => {
    selectOnce([inviteRow({ revokedAt: YESTERDAY })]);

    const result = await acceptOrgInvite({ token: validToken, userId: 1 });

    expect(result).toEqual({ ok: false, error: "Invite has been revoked" });
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it("rejects an expired invite", async () => {
    selectOnce([inviteRow({ expiresAt: YESTERDAY })]);

    const result = await acceptOrgInvite({ token: validToken, userId: 1 });

    expect(result).toEqual({ ok: false, error: "Invite has expired" });
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });
});

describe("acceptOrgInvite — firm invite acceptance", () => {
  const validToken = "B".repeat(43);

  it("creates the organization with the accepting user as owner", async () => {
    selectOnce([inviteRow({ prefill: { orgName: "Acme Law", vertical: "law", plan: "growth" } })]); // invite lookup
    selectOnce([{ id: 55, email: "owner@newfirm.com" }]); // accepting user
    selectOnce([]); // getOrgMembership — not in any org yet
    const orgInsert = insertOnce([{ id: 900 }]); // organizations insert
    const memberInsert = insertOnce(undefined); // organization_members insert
    updateOnce(); // org_invites.acceptedAt

    const result = await acceptOrgInvite({ token: validToken, userId: 55 });

    expect(result).toEqual({ ok: true, organizationId: 900, kind: "firm" });

    expect(dbMock.insert).toHaveBeenNthCalledWith(1, organizationsTable);
    const orgValues = orgInsert.values.mock.calls[0][0];
    expect(orgValues.name).toBe("Acme Law");
    expect(orgValues.plan).toBe("growth");
    expect(orgValues.vertical).toBe("law");
    expect(orgValues.ownerId).toBe(55);

    expect(dbMock.insert).toHaveBeenNthCalledWith(2, organizationMembersTable);
    const memberValues = memberInsert.values.mock.calls[0][0];
    expect(memberValues.organizationId).toBe(900);
    expect(memberValues.userId).toBe(55);
    expect(memberValues.role).toBe("owner");
  });

  it("falls back to the email domain when prefill has no org name", async () => {
    selectOnce([inviteRow({ prefill: {}, email: "jane@acmelaw.example" })]);
    selectOnce([{ id: 56, email: "jane@acmelaw.example" }]);
    selectOnce([]);
    const orgInsert = insertOnce([{ id: 901 }]);
    insertOnce(undefined);
    updateOnce();

    const result = await acceptOrgInvite({ token: validToken, userId: 56 });

    expect(result.ok).toBe(true);
    expect(orgInsert.values.mock.calls[0][0].name).toBe("Acmelaw");
  });

  it("attaches an existing platform user to the new org instead of creating a duplicate", async () => {
    // The accepting user already exists (that's how they got a userId at all) — the point of
    // this test is that acceptOrgInvite never inserts into usersTable, only organizations and
    // organization_members.
    selectOnce([inviteRow()]);
    selectOnce([{ id: 55, email: "owner@newfirm.com" }]);
    selectOnce([]);
    insertOnce([{ id: 902 }]);
    insertOnce(undefined);
    updateOnce();

    await acceptOrgInvite({ token: validToken, userId: 55 });

    const insertedTables = dbMock.insert.mock.calls.map((call) => call[0]);
    expect(insertedTables).not.toContain(usersTable);
    expect(insertedTables).toEqual([organizationsTable, organizationMembersTable]);
  });

  it("rejects a firm invite for a user who already belongs to an organization", async () => {
    selectOnce([inviteRow()]);
    selectOnce([{ id: 55, email: "owner@newfirm.com" }]);
    selectOnce([{ organizationId: 12, orgRole: "owner", assignedProjectId: null, organizationPlan: "starter", suspendedAt: null, securitySettings: null }]);

    const result = await acceptOrgInvite({ token: validToken, userId: 55 });

    expect(result).toEqual({ ok: false, error: "You already belong to an organization" });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("loses the double-accept race cleanly instead of creating a second organization", async () => {
    // Simulates two concurrent accept requests for the same firm invite (a double-click,
    // two open tabs, a retried network request). Both read the invite before either has
    // written acceptedAt, so both pass the earlier ok-to-accept checks — the only thing
    // standing between one organization and two is the atomic `UPDATE ... WHERE
    // accepted_at IS NULL RETURNING id`. This test is the loser's view: the conditional
    // update matches no row (someone else claimed it first), so `.returning()` yields [].
    selectOnce([inviteRow()]);
    selectOnce([{ id: 55, email: "owner@newfirm.com" }]);
    selectOnce([]); // getOrgMembership — not in any org yet, same as the winner saw
    updateOnce([]); // the claim lost the race

    const result = await acceptOrgInvite({ token: validToken, userId: 55 });

    expect(result).toEqual({ ok: false, error: "Invite has already been accepted" });
    // No organization or membership row was created for the loser.
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});
