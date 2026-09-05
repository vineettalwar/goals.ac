import { describe, expect, it, vi, beforeEach } from "vitest";

function chain<T>(result: T) {
  const obj: Record<string, unknown> = {};
  for (const method of ["from", "where", "values"]) {
    obj[method] = vi.fn(() => obj);
  }
  obj.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return obj as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T>;
}

const dbMock = { select: vi.fn(), insert: vi.fn() };

vi.mock("@workspace/db", () => ({ db: dbMock }));
vi.mock("@workspace/db/schema", () => ({ keywordOpportunitiesTable: {} }));

const { seedColdStartOpportunities } = await import("./cold-start");

beforeEach(() => {
  dbMock.select.mockReset().mockReturnValue(chain([]));
  dbMock.insert.mockReset();
});

describe("seedColdStartOpportunities — last-resort fallback when the AI-driven cold start yields nothing", () => {
  it("never writes a literal {placeholder} token into a customer-visible field", async () => {
    const insertedValues: Array<Record<string, unknown>> = [];
    dbMock.insert.mockImplementation(() => {
      const obj: Record<string, unknown> = {
        values: vi.fn((v: Record<string, unknown>) => {
          insertedValues.push(v);
          return Promise.resolve();
        }),
      };
      return obj;
    });

    await seedColdStartOpportunities(1, "law", []);

    expect(insertedValues.length).toBeGreaterThan(0);
    for (const row of insertedValues) {
      for (const field of ["keyword", "suggestedTitle", "suggestedAngle"]) {
        expect(String(row[field])).not.toMatch(/\{[a-zA-Z][a-zA-Z0-9 ]*\}/);
      }
    }
  });
});
