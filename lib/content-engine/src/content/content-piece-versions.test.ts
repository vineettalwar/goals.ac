import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Condition = { field: string; value: unknown };

const state = vi.hoisted(() => ({
  rows: [] as Row[],
  nextId: 1,
}));

// The mocked table's "columns" are just the row keys the service reads and
// writes them under, so eq()/desc() below can address rows directly without
// reimplementing drizzle's SQL builder.
vi.mock("@workspace/db/schema", () => ({
  contentPieceVersionsTable: {
    contentPieceId: "contentPieceId",
    versionNumber: "versionNumber",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (field: string, value: unknown): Condition => ({ field, value }),
  and: (...conds: Condition[]) => conds,
  desc: (field: string) => ({ desc: field }),
  sql: Object.assign((_strings: TemplateStringsArray) => "AGGREGATE_NEXT_VERSION", {}),
}));

function matches(row: Row, where: Condition | Condition[]): boolean {
  const conds = Array.isArray(where) ? where : [where];
  return conds.every((c) => row[c.field] === c.value);
}

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn((selection?: Record<string, unknown>) => ({
      from: () => ({
        where: (where: Condition | Condition[]) => {
          const matched = state.rows.filter((r) => matches(r, where));
          const isAggregate = selection && "nextVersion" in selection;

          const resolveList = () => Promise.resolve(matched);
          const chain: {
            limit: (n: number) => Promise<Row[]>;
            orderBy: (spec: { desc: string }) => Promise<Row[]>;
            then: (resolve: (v: Row[]) => void, reject: (e: unknown) => void) => void;
          } = {
            limit: (n: number) => Promise.resolve(matched.slice(0, n)),
            orderBy: (spec: { desc: string }) =>
              Promise.resolve(
                [...matched].sort((a, b) => (b[spec.desc] as number) - (a[spec.desc] as number)),
              ),
            then: (resolve, reject) => {
              if (isAggregate) {
                const max = matched.reduce((m, r) => Math.max(m, (r.versionNumber as number) ?? 0), 0);
                resolve([{ nextVersion: max + 1 }]);
              } else {
                resolveList().then(resolve, reject);
              }
            },
          };
          return chain;
        },
      }),
    })),
    insert: vi.fn(() => ({
      values: (values: Row) => {
        const row: Row = { id: state.nextId++, createdAt: new Date(), ...values };
        state.rows.push(row);
        return {
          returning: () => Promise.resolve([row]),
        };
      },
    })),
  },
}));

import { recordContentPieceVersion, listContentPieceVersions } from "./content-piece-versions";

beforeEach(() => {
  state.rows = [];
  state.nextId = 1;
});

describe("recordContentPieceVersion", () => {
  it("starts a piece's version numbering at 1", async () => {
    const version = await recordContentPieceVersion({
      contentPieceId: 42,
      title: "First draft",
      bodyMarkdown: "body v1",
      changeType: "generate",
      createdByUserId: 7,
    });

    expect(version.versionNumber).toBe(1);
    expect(version.title).toBe("First draft");
    expect(version.changeType).toBe("generate");
  });

  it("increments sequentially per content piece", async () => {
    await recordContentPieceVersion({
      contentPieceId: 42,
      title: "v1",
      bodyMarkdown: "body v1",
      changeType: "generate",
    });
    await recordContentPieceVersion({
      contentPieceId: 42,
      title: "v1",
      bodyMarkdown: "body v2",
      changeType: "humanize",
    });
    const third = await recordContentPieceVersion({
      contentPieceId: 42,
      title: "v1",
      bodyMarkdown: "body v3",
      changeType: "edit",
      createdByUserId: 9,
    });

    expect(third.versionNumber).toBe(3);
  });

  it("numbers each content piece independently", async () => {
    await recordContentPieceVersion({
      contentPieceId: 1,
      title: "piece one",
      bodyMarkdown: "a",
      changeType: "generate",
    });
    await recordContentPieceVersion({
      contentPieceId: 1,
      title: "piece one",
      bodyMarkdown: "b",
      changeType: "edit",
    });
    const otherPieceFirst = await recordContentPieceVersion({
      contentPieceId: 2,
      title: "piece two",
      bodyMarkdown: "a",
      changeType: "generate",
    });

    expect(otherPieceFirst.versionNumber).toBe(1);
  });
});

describe("listContentPieceVersions", () => {
  it("returns a piece's versions newest first", async () => {
    await recordContentPieceVersion({
      contentPieceId: 5,
      title: "t",
      bodyMarkdown: "one",
      changeType: "generate",
    });
    await recordContentPieceVersion({
      contentPieceId: 5,
      title: "t",
      bodyMarkdown: "two",
      changeType: "regenerate",
    });
    await recordContentPieceVersion({
      contentPieceId: 5,
      title: "t",
      bodyMarkdown: "three",
      changeType: "edit",
    });

    const versions = await listContentPieceVersions(5);

    expect(versions.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
    expect(versions.map((v) => v.bodyMarkdown)).toEqual(["three", "two", "one"]);
  });

  it("only returns versions for the requested piece", async () => {
    await recordContentPieceVersion({
      contentPieceId: 10,
      title: "t",
      bodyMarkdown: "a",
      changeType: "generate",
    });
    await recordContentPieceVersion({
      contentPieceId: 11,
      title: "t",
      bodyMarkdown: "b",
      changeType: "generate",
    });

    const versions = await listContentPieceVersions(10);

    expect(versions).toHaveLength(1);
    expect(versions[0]!.contentPieceId).toBe(10);
  });
});
