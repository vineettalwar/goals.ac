import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionState: { session: { id?: string; role?: string } | null } = { session: null };

vi.mock("@workspace/cf-edge/jwt", () => ({
  verifySessionClaims: vi.fn(async () => sessionState.session),
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    setD1Binding: vi.fn(),
  };
});

const { default: worker } = await import("./index");

function makeKv(store: Record<string, string>) {
  return {
    get: async (key: string) => store[key] ?? null,
    put: async (key: string, value: string) => {
      store[key] = value;
    },
  };
}

function makeEnv(store: Record<string, string>) {
  return {
    DB: {} as never,
    AI_CACHE: makeKv(store),
    AUTH_SECRET: "test-secret",
  } as never;
}

describe("GET /api/jobs/:jobId", () => {
  beforeEach(() => {
    sessionState.session = null;
  });

  it("returns 401 for an unauthenticated caller (job route is behind auth)", async () => {
    const store = {
      "job:status:cf:content-publish:job-1": JSON.stringify({
        jobId: "cf:content-publish:job-1",
        status: "completed",
        userId: 7,
      }),
    };
    const res = await worker.fetch(
      new Request("https://read.example/api/jobs/cf:content-publish:job-1"),
      makeEnv(store),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for a caller who does not own the job", async () => {
    sessionState.session = { id: "99", role: "user" };
    const store = {
      "job:status:cf:content-publish:job-1": JSON.stringify({
        jobId: "cf:content-publish:job-1",
        status: "completed",
        userId: 7,
        publishedUrl: "https://tenant-7.example.com/secret-post",
      }),
    };
    const res = await worker.fetch(
      new Request("https://read.example/api/jobs/cf:content-publish:job-1"),
      makeEnv(store),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("tenant-7");
  });

  it("returns 404 for a tracked job with no stored owner", async () => {
    sessionState.session = { id: "99", role: "user" };
    const store = {
      "job:status:cf:content-publish:job-2": JSON.stringify({
        jobId: "cf:content-publish:job-2",
        status: "queued",
      }),
    };
    const res = await worker.fetch(
      new Request("https://read.example/api/jobs/cf:content-publish:job-2"),
      makeEnv(store),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown job id", async () => {
    sessionState.session = { id: "99", role: "user" };
    const res = await worker.fetch(
      new Request("https://read.example/api/jobs/cf:content-publish:does-not-exist"),
      makeEnv({}),
    );
    expect(res.status).toBe(404);
  });

  it("returns the status for the job's owner", async () => {
    sessionState.session = { id: "7", role: "user" };
    const store = {
      "job:status:cf:content-publish:job-1": JSON.stringify({
        jobId: "cf:content-publish:job-1",
        status: "completed",
        userId: 7,
        publishedUrl: "https://tenant-7.example.com/secret-post",
      }),
    };
    const res = await worker.fetch(
      new Request("https://read.example/api/jobs/cf:content-publish:job-1"),
      makeEnv(store),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; publishedUrl: string };
    expect(body.status).toBe("completed");
    expect(body.publishedUrl).toBe("https://tenant-7.example.com/secret-post");
  });
});
