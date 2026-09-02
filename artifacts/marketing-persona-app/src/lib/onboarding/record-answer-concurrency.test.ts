import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Minimal fluent stand-in for a drizzle query builder, matching the pattern used in
 * org-access-invites.test.ts. Each chain method returns the same object; the object
 * itself is thenable and `.returning()` resolves to whatever result was queued.
 */
function chain<T>(result: T) {
  const obj: Record<string, unknown> = {};
  for (const method of ["from", "where", "orderBy", "limit", "set", "values"]) {
    obj[method] = vi.fn(() => obj);
  }
  obj.returning = vi.fn(() => Promise.resolve(result));
  obj.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T>;
}

const dbMock = { select: vi.fn(), update: vi.fn(), insert: vi.fn() };

vi.mock("@workspace/db", () => ({ db: dbMock, isUniqueConstraintError: vi.fn(() => false) }));
vi.mock("@/lib/org/org-access", () => ({ resolveOrganizationIdForUser: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/utils/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("./project-init", () => ({ initCompanyAndProject: vi.fn() }));

const { recordAnswer, OnboardingConcurrentWriteError } = await import("./session-service");

function selectOnce<T>(result: T) {
  dbMock.select.mockReturnValueOnce(chain(result));
}
function updateOnce<T>(result: T) {
  const built = chain(result);
  dbMock.update.mockReturnValueOnce(built);
  return built;
}

const NOW = new Date("2026-09-01T12:00:00Z");
const LATER = new Date("2026-09-01T12:00:05Z");

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 55,
    organizationId: null,
    companyId: null,
    websiteProjectId: null,
    inviteId: null,
    vertical: null,
    currentStep: "audience",
    answers: { orgName: "Acme Law" },
    stepStatus: { firm_name: "done", vertical: "done", website: "done" },
    completedAt: null,
    updatedAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  dbMock.select.mockReset();
  dbMock.update.mockReset();
  dbMock.insert.mockReset();
});

describe("recordAnswer — concurrent write on the actual database path", () => {
  it("writes straight through when nobody else touched the session", async () => {
    selectOnce([baseSession()]); // findActiveSession
    updateOnce([baseSession({ answers: { orgName: "Acme Law", audience: "Small firms" }, updatedAt: LATER })]);

    const result = await recordAnswer(55, "audience", "Small firms");

    expect(result.session.answers).toEqual({ orgName: "Acme Law", audience: "Small firms" });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it("re-merges on top of a concurrent write instead of losing it (the two-tab race)", async () => {
    // Tab A reads the session first.
    selectOnce([baseSession()]);
    // Tab A's conditional UPDATE (WHERE updatedAt = NOW) matches nothing: tab B's
    // write already landed and bumped updatedAt, so the optimistic lock is lost.
    updateOnce([]);
    // Tab A re-reads the row tab B just wrote.
    selectOnce([baseSession({ answers: { orgName: "Acme Law", vertical: "law" }, updatedAt: LATER })]);
    // Tab A's retry succeeds, merging its own answer on top of tab B's.
    const secondUpdate = updateOnce([
      baseSession({
        answers: { orgName: "Acme Law", vertical: "law", audience: "Small firms" },
        updatedAt: new Date("2026-09-01T12:00:10Z"),
      }),
    ]);

    const result = await recordAnswer(55, "audience", "Small firms");

    // Tab B's vertical answer survived; it was not overwritten by tab A's stale view.
    expect(result.session.answers).toEqual({
      orgName: "Acme Law",
      vertical: "law",
      audience: "Small firms",
    });
    expect(dbMock.update).toHaveBeenCalledTimes(2);
    expect(secondUpdate.set).toHaveBeenCalled();
  });

  it("gives up with a clear error rather than looping forever under sustained contention", async () => {
    selectOnce([baseSession()]);
    for (let i = 0; i < 5; i++) {
      updateOnce([]); // every attempt loses the race
      selectOnce([baseSession({ updatedAt: new Date(NOW.getTime() + i + 1) })]);
    }

    await expect(recordAnswer(55, "audience", "Small firms")).rejects.toThrow(OnboardingConcurrentWriteError);
  });
});
