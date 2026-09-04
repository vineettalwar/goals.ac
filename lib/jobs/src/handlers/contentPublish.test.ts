import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  updateCalls: [] as { values: Record<string, unknown> }[],
  runPublishMock: vi.fn(async (_args?: unknown) => ({
    publishedUrl: "https://example.com/post",
    publishPlatform: "wordpress",
    outputMode: null,
    warnings: [] as { code: string; message: string }[],
  })),
  verifyCitationsMock: vi.fn(async (urls: string[], _options?: unknown) => ({
    checks: urls.map((url) => ({ url, verdict: "reachable" as const })),
    verifiedUrls: urls,
  })),
  siteGraphMock: vi.fn(async (_creds?: unknown) => ({ posts: [] as { slug?: string }[] })),
  recordReadinessAssessmentMock: vi.fn(async (_input?: unknown) => undefined),
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
  // Pass credentials through as-is so tests can control them via the project row.
  decryptCmsCredentials: (raw: unknown) => raw,
  resolveWordPressConnectionType: (wp: { connectionType?: string } | undefined) =>
    wp?.connectionType ?? "api",
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
  resolvePrimaryBlogDestination: (creds: { wordpress?: unknown } | undefined) =>
    creds?.wordpress ? "wordpress" : null,
  resolvePrimaryEspDestination: () => undefined,
}));

vi.mock("@workspace/content-engine/support/publishing/publish-records", () => ({
  withPublishRecord: async (_meta: unknown, fn: () => Promise<unknown>) => fn(),
  recordReadinessAssessment: (input: unknown) => state.recordReadinessAssessmentMock(input),
}));

vi.mock("@workspace/content-engine/social/social-metrics-service", () => ({
  seedSocialPostMetrics: vi.fn(),
}));

vi.mock("@workspace/content-engine/support/brand/brand-voice-generation", () => ({
  ingestPublishedContentPiece: vi.fn(async () => undefined),
}));

// Underlies collectReadinessInputs (imported for real, not mocked): mocking its
// network edges is enough to keep the readiness gate's decisions realistic
// without ever touching the network.
vi.mock("@workspace/content-engine/content/citation-verifier", () => ({
  verifyCitations: (urls: string[], options?: unknown) => state.verifyCitationsMock(urls, options),
}));

vi.mock("@workspace/connectors/goals-ac-plugin", () => ({
  fetchGoalsAcSiteGraph: (creds: unknown) => state.siteGraphMock(creds),
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

const PLUGIN_PROJECT = {
  cmsIntegrations: {
    wordpress: { connectionType: "plugin", siteUrl: "https://goals.ac", siteKey: "test-site-key" },
  },
  autopilotSettings: {},
};

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
  state.verifyCitationsMock.mockClear();
  state.verifyCitationsMock.mockImplementation(async (urls: string[]) => ({
    checks: urls.map((url) => ({ url, verdict: "reachable" as const })),
    verifiedUrls: urls,
  }));
  state.siteGraphMock.mockClear();
  state.siteGraphMock.mockResolvedValue({ posts: [] });
  state.recordReadinessAssessmentMock.mockClear();
  state.recordReadinessAssessmentMock.mockResolvedValue(undefined);
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
    queuePieceAndProject(blockedPiece);

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
    // Override means "do not spend time verifying anything".
    expect(state.verifyCitationsMock).not.toHaveBeenCalled();
    expect(state.siteGraphMock).not.toHaveBeenCalled();
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

  it("still publishes a piece with internal links when the site graph fetch fails (regression)", async () => {
    state.siteGraphMock.mockRejectedValueOnce(new Error("goals.ac plugin unreachable"));
    const piece = {
      ...BASE_PIECE,
      pieceMetadata: {
        ...BASE_PIECE.pieceMetadata,
        internalLinkSuggestions: [
          { anchorText: "related guide", suggestedSlug: "/some-other-post" },
        ],
      },
    };
    queuePieceAndProject(piece, PLUGIN_PROJECT);

    await publishPiece(1, 5);

    expect(state.siteGraphMock).toHaveBeenCalledOnce();
    expect(state.runPublishMock).toHaveBeenCalledOnce();
    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
  });

  it("blocks a piece whose internal link is dangling once the site graph resolves", async () => {
    state.siteGraphMock.mockResolvedValueOnce({ posts: [{ slug: "existing-post" }] });
    const piece = {
      ...BASE_PIECE,
      pieceMetadata: {
        ...BASE_PIECE.pieceMetadata,
        internalLinkSuggestions: [
          { anchorText: "related guide", suggestedSlug: "/some-other-post" },
        ],
      },
    };
    queuePieceAndProject(piece, PLUGIN_PROJECT);

    await publishPiece(1, 5);

    expect(state.runPublishMock).not.toHaveBeenCalled();
    const [{ values }] = state.updateCalls;
    expect(values.status).toBe("draft");
    const meta = values.pieceMetadata as { publishBlocked?: { blockers: { code: string }[] } };
    expect(meta.publishBlocked!.blockers.some((b) => b.code === "dangling_internal_link")).toBe(true);
  });

  it("blocks a piece when a citation URL is unreachable", async () => {
    state.verifyCitationsMock.mockResolvedValueOnce({ checks: [], verifiedUrls: [] });
    queuePieceAndProject(BASE_PIECE);

    await publishPiece(1, 5);

    expect(state.runPublishMock).not.toHaveBeenCalled();
    const [{ values }] = state.updateCalls;
    expect(values.status).toBe("draft");
    const meta = values.pieceMetadata as { publishBlocked?: { blockers: { code: string }[] } };
    expect(meta.publishBlocked!.blockers.some((b) => b.code === "unreachable_citation")).toBe(true);
  });

  it("publishes when all citation URLs verify as reachable", async () => {
    queuePieceAndProject(BASE_PIECE);

    await publishPiece(1, 5);

    expect(state.verifyCitationsMock).toHaveBeenCalledOnce();
    expect(state.runPublishMock).toHaveBeenCalledOnce();
    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
  });

  it("caps the number of citation URLs sent to verification per piece", async () => {
    const manyLinks = Array.from({ length: 30 }, (_, i) => `[Source ${i}](https://example.com/source-${i})`).join(
      " ",
    );
    const piece = {
      ...BASE_PIECE,
      bodyMarkdown: `## Overview\n\n${"Detail about widget maintenance. ".repeat(40)}\n\n${manyLinks}\n\n### FAQ\n\n${Array.from(
        { length: 3 },
        (_, i) => `**Q${i}: Question ${i}?**\nA${i}: Answer ${i}.`,
      ).join("\n\n")}`,
    };
    queuePieceAndProject(piece);

    await publishPiece(1, 5);

    expect(state.verifyCitationsMock).toHaveBeenCalledOnce();
    const [urls] = state.verifyCitationsMock.mock.calls[0]!;
    expect((urls as string[]).length).toBeLessThanOrEqual(25);
  });

  it("records the quality score and blocker codes for a blocked attempt", async () => {
    const blockedPiece = {
      ...BASE_PIECE,
      bodyMarkdown: "Too short.",
      pieceMetadata: { metaDescription: undefined },
    };
    queuePieceAndProject(blockedPiece);

    await publishPiece(1, 5);

    expect(state.recordReadinessAssessmentMock).toHaveBeenCalledOnce();
    const [telemetry] = state.recordReadinessAssessmentMock.mock.calls[0]! as [
      { blocked: boolean; qualityScore: number; blockerCodes: string[] },
    ];
    expect(telemetry.blocked).toBe(true);
    expect(typeof telemetry.qualityScore).toBe("number");
    expect(telemetry.blockerCodes.length).toBeGreaterThan(0);
  });

  it("records the quality score for a clean, published attempt with no blocker codes", async () => {
    queuePieceAndProject(BASE_PIECE);

    await publishPiece(1, 5);

    expect(state.recordReadinessAssessmentMock).toHaveBeenCalledOnce();
    const [telemetry] = state.recordReadinessAssessmentMock.mock.calls[0]! as [
      { blocked: boolean; qualityScore: number; blockerCodes: string[] },
    ];
    expect(telemetry.blocked).toBe(false);
    expect(telemetry.blockerCodes).toEqual([]);
    expect(state.runPublishMock).toHaveBeenCalledOnce();
  });

  it("does not fail the publish when readiness telemetry recording throws", async () => {
    state.recordReadinessAssessmentMock.mockRejectedValueOnce(new Error("telemetry db down"));
    queuePieceAndProject(BASE_PIECE);

    await expect(publishPiece(1, 5)).resolves.toBeUndefined();

    const publishUpdate = state.updateCalls.find((c) => c.values.status === "published");
    expect(publishUpdate).toBeDefined();
  });
});
