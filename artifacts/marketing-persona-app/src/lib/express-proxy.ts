import jwt from "jsonwebtoken";
import { auth } from "@/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const EXPRESS_API_URL = (process.env.EXPRESS_API_URL ?? "http://localhost:8080/api").replace(/\/$/, "");

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required for Express API proxy");
  }
  return secret ?? "goals-ac-dev-secret-change-in-production";
}

export async function mintExpressAccessToken(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return null;
  return jwt.sign(
    { userId, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: "15m" },
  );
}

export type ProxyToExpressOptions = RequestInit & {
  /** When false, do not attach a bearer token (anonymous Express optionalAuth). Default true. */
  attachSession?: boolean;
};

export async function proxyToExpress(
  path: string,
  options: ProxyToExpressOptions = {},
): Promise<Response> {
  const { attachSession = true, ...init } = options;
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (attachSession) {
    const session = await auth();
    if (session?.user?.id) {
      const token = await mintExpressAccessToken(Number(session.user.id));
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${EXPRESS_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get("Content-Type") ?? "application/json";
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}

/** Map marketing-app camelCase bodies to Express snake_case where needed. */
export function toExpressGeoAuditBody(body: Record<string, unknown>): Record<string, unknown> {
  return {
    url: body.url,
    roadmap_id: body.roadmapId ?? body.roadmap_id,
    website_project_id: body.websiteProjectId ?? body.website_project_id,
  };
}

export function toExpressCompetitorBody(body: Record<string, unknown>): Record<string, unknown> {
  return {
    competitorUrl: body.competitorUrl,
    industry: body.industry,
    location: body.location,
    stage: body.stage,
    website_project_id: body.websiteProjectId ?? body.website_project_id,
  };
}

export function toExpressKeywordBody(body: Record<string, unknown>): Record<string, unknown> {
  return {
    keywords: body.keywords,
    websiteUrl: body.websiteUrl,
    website_project_id: body.websiteProjectId ?? body.website_project_id,
  };
}
