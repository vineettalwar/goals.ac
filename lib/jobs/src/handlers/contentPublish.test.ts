import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  updateCalls: [] as { values: Record<string, unknown>; }[],
  runPublishMock: vi.fn(async (_args?: unknown) => ({
    publishedUrl: "https://example.com/post",
    publishPlatform: "wordpress",
    outputMode: null,
    warnings: [] as { code: string; message: string }[],
  })),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => state.selectResults.shift() ?? [],
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: (values: Record<string, unknown>) => {
        state.updateCalls.push({ values });
        return { where: async () => undefined };
      },
    })),
  },
  contentPiecesTable: { id: "id", status: "status" },
  websiteProjectsTable: { id: "id", userId: "userId" },
  SOCIAL_FORMAT_TYPES: ["linkedin_post", "twitter_thread"],
}));

vi.mock("@workspace/content-engine/support/publishing/cms-integrations", () => ({
  decryptCmsCredentials: () => ({}),
}));

vi.mock("@workspace/content-engine/support/autopilot/autopilot-scheduler", () => ({
  parseAutopilotSettings: () => ({}),
  wordpressPublishStatus: () => "publish",
}));

vi.mock("@workspace/content-engine/support/social/social-publish", () => ({
  publishPieceToSocial: vi.fn(),
  isSocialPlatform: () => false,
}));

vi.mock("@workspace/content-engine/support/social/social-queue-service", () => ({
  listDueSocialPieces: async () => [],
}));

vi.mock("@workspace/content-engine/articles/article-image-enricher", () => ({
  featuredImageFromMetadata: () => undefined,
}));

vi.mock("@workspace/content-engine/support/publishing/publish-destination", () => ({
  publishPieceToDestination: vi.fn(),
  publishBlogPieceToPrimaryDestination: (...args: unknown[]) => state.runPublishMock(args),
  resolvePrimaryEspDestination: () => undefined,
}));

vi.mock("@workspace/content-engine/support/publishing/publish-records", () => ({
  withPublishRecord: async (_meta: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@workspace/content-engine/social/social-metrics-service", () => ({
  seedSocialPostMetrics: vi.fn(),
}));

vi.mock("@workspace/content-engine/support/brand/brand-voice-generation", () => ({
  ingestPublishedContentPiece: vi.fn(async () => undefined),
}));

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { publishPiece } from "./contentPublish";

const BASE_PIECE = {
  id: 1,
  websiteProjectId: 10,
  status: "ready",
  title: "A Well-Formed Guide to Widget Maintenance",
  bodyMarkdown:
    "## Overview\n\nThis is a thorough guide to widget maintenance with plenty of detail. ".repeat(20) +
    "\n\n" +
    Array.from({ length: 4 }, (_, i) => `[Source ${i}](https://example.com/source-${i})`).join(" ") +
    "\n\n### FAQ\n\n" +
    Array.from({ length: 3 }, (_, i) => `**Q${i}: Question ${i}?**\nA${i}: Answer ${i}.`).join("\n\n"),
  formatType: "blog_post",
  publishPlatform: null,
  targetKeyword: "widget maintenance",
  pieceMetadata: {
    seoTitle: "A Well-Formed Guide to Widget Maintenance for Facilities Teams",
    metaDescription:
      "Learn how to maintain widgets properly with this complete, practical guide covering schedules, tools, and common failure modes.",
    jsonLdSchema: { "@type": "Article" },
  },
};

const BASE_PROJECT = { cmsIntegrations: {}, autopilotSettings: {} };

function queuePieceAndProject(piece: unknown, project: unknown = BASE_PROJECT) {
  state.selectResults.push([piece], [project]);
}

beforeEach(() => {
  state.selectResults = [];
  state.updateCalls = [];
  state.runPublishMock.mockClear();
  state.runPublishMock.mockResolvedValue({
    publishedUrl: "https://example.com/post",
    publishPlatform: "wordpress",
    outputMode: null,
    warnings: [],
  });
});

describe("publishPiece readiness gate", () => {
  it("publishes a clean piece", async () => {
    queuePieceAndProject(BASE_PIECE);

    await publishPiece(1, 5);

    expect(state.runPublishMock).toHaveBeenCalledOnce();
    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
    expect(publishUpdate!.values.publishedUrl).toBe("https://example.com/post");
  });

  it("does not publish a piece with blockers and marks it blocked", async () => {
    const blockedPiece = {
      ...BASE_PIECE,
      bodyMarkdown: "Too short.",
      pieceMetadata: { metaDescription: undefined },
    };
    // only one select call happens: readiness check trips before the project fetch
    state.selectResults.push([blockedPiece]);

    await publishPiece(1, 5);

    expect(state.runPublishMock).not.toHaveBeenCalled();
    expect(state.updateCalls).toHaveLength(1);
    const [{ values }] = state.updateCalls;
    expect(values.status).toBe("draft");
    const meta = values.pieceMetadata as { publishBlocked?: { blockers: unknown[]; attempt?: number } };
    expect(meta.publishBlocked).toBeDefined();
    expect(meta.publishBlocked!.blockers.length).toBeGreaterThan(0);
    expect(meta.publishBlocked!.attempt).toBe(1);
  });

  it("publishes despite blockers when a valid publishOverride is present", async () => {
    const overriddenPiece = {
      ...BASE_PIECE,
      bodyMarkdown: "Too short.",
      pieceMetadata: {
        publishOverride: {
          reason: "Editor reviewed manually and approved for a time-sensitive release.",
          blockers: [],
          userId: 5,
          overriddenAt: new Date().toISOString(),
        },
      },
    };
    queuePieceAndProject(overriddenPiece);

    await publishPiece(1, 5);

    expect(state.runPublishMock).toHaveBeenCalledOnce();
    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
  });

  it("does not block on warnings alone", async () => {
    const thinPiece = {
      ...BASE_PIECE,
      bodyMarkdown:
        "## Overview\n\nShort but valid body with a citation link and no other issues at all here today.\n\n" +
        "[Source](https://example.com/source)",
    };
    queuePieceAndProject(thinPiece);

    await publishPiece(1, 5);

    expect(state.runPublishMock).toHaveBeenCalledOnce();
    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
  });
});
