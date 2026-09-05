import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Fluent stand-in for a drizzle query builder — same pattern as
 * record-answer-concurrency.test.ts. Each chain method returns the same object;
 * the object itself is thenable and resolves to whatever result was queued.
 */
function chain<T>(result: T) {
  const obj: Record<string, unknown> = {};
  for (const method of ["from", "where", "orderBy", "limit", "set", "values", "onConflictDoNothing"]) {
    obj[method] = vi.fn(() => obj);
  }
  obj.returning = vi.fn(() => Promise.resolve(result));
  obj.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T>;
}

const dbMock = { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
const discoverColdStartOpportunities = vi.fn();
const seedColdStartOpportunities = vi.fn();
const queueOpportunityToStrategy = vi.fn();
const enqueue = vi.fn();

vi.mock("@workspace/db", () => ({ db: dbMock }));
vi.mock("@workspace/db/schema", () => ({
  contentStrategiesTable: {},
  keywordOpportunitiesTable: {},
  roadmapsTable: {},
}));
vi.mock("@workspace/jobs", () => ({ enqueue, QUEUES: { contentGenerate: "content-generate" } }));
vi.mock("@workspace/content-engine/strategy/keyword-opportunity-service", () => ({
  queueOpportunityToStrategy,
  discoverColdStartOpportunities,
}));
vi.mock("@workspace/content-engine/vertical-presets", () => ({
  getVerticalPreset: vi.fn(() => ({ label: "Law firm" })),
}));
vi.mock("./cold-start", () => ({ seedColdStartOpportunities }));

const { dispatchFirstArticleGeneration } = await import("./first-article");

function selectOnce<T>(result: T) {
  dbMock.select.mockReturnValueOnce(chain(result));
}

beforeEach(() => {
  dbMock.select.mockReset();
  dbMock.update.mockReset();
  dbMock.insert.mockReset();
  discoverColdStartOpportunities.mockReset();
  seedColdStartOpportunities.mockReset();
  queueOpportunityToStrategy.mockReset().mockResolvedValue({ contentItemId: 9, strategyId: 1 });
  enqueue.mockReset().mockResolvedValue("job-1");
});

describe("cold-start opportunity resolution — a brand-new firm with zero topics", () => {
  it("prefers the vertical-aware, brand-grounded generator over the placeholder-stripping fallback", async () => {
    selectOnce([]); // top scored open opportunity: none yet
    discoverColdStartOpportunities.mockResolvedValue(3); // AI-driven cold start produced ideas
    selectOnce([{ id: 42 }]); // re-read after cold start: the AI-seeded opportunity
    selectOnce([{ id: 7 }]); // initMinimalStrategy: existing strategy found

    const result = await dispatchFirstArticleGeneration({
      projectId: 1,
      userId: 55,
      vertical: "law",
    });

    expect(discoverColdStartOpportunities).toHaveBeenCalledWith(1, 55);
    // The naive local fallback must not run when the real generator produced ideas —
    // it strips {placeholder} tokens rather than filling them from the brand's real
    // services, and running it anyway would waste a redundant DB write.
    expect(seedColdStartOpportunities).not.toHaveBeenCalled();
    expect(result).toEqual({ dispatched: true, contentItemId: 9 });
  });

  it("falls back to the local seeder only when the AI-driven generator produced nothing", async () => {
    selectOnce([]); // top scored open opportunity: none yet
    discoverColdStartOpportunities.mockResolvedValue(0); // no AI client configured, say
    seedColdStartOpportunities.mockResolvedValue(2);
    selectOnce([{ id: 99 }]); // re-read after the fallback seed
    selectOnce([{ id: 7 }]); // initMinimalStrategy: existing strategy found

    await dispatchFirstArticleGeneration({
      projectId: 1,
      userId: 55,
      vertical: "law",
      competitorUrls: ["https://acompetitor.com"],
    });

    expect(seedColdStartOpportunities).toHaveBeenCalledWith(1, "law", ["https://acompetitor.com"]);
  });

  it("falls back to the local seeder when the AI-driven generator throws rather than failing dispatch", async () => {
    selectOnce([]); // top scored open opportunity: none yet
    discoverColdStartOpportunities.mockRejectedValue(new Error("AI client unavailable"));
    seedColdStartOpportunities.mockResolvedValue(1);
    selectOnce([{ id: 5 }]); // re-read after the fallback seed
    selectOnce([{ id: 7 }]); // initMinimalStrategy: existing strategy found

    const result = await dispatchFirstArticleGeneration({
      projectId: 1,
      userId: 55,
      vertical: "law",
    });

    expect(seedColdStartOpportunities).toHaveBeenCalled();
    expect(result.dispatched).toBe(true);
  });
});
