import { setD1Binding, db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  goalsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { eq, desc } from "drizzle-orm";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { kvGetJson } from "@workspace/cf-edge/kv-cache";
import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  AUTH_SECRET: string;
}

async function requireAuth(request: Request, env: Env) {
  const secret = env.AUTH_SECRET;
  if (!secret) return null;
  return verifySessionClaims(request, secret);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    wireCfEdgeEnv(env);
    setD1Binding(env.DB);
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" && request.method === "GET") {
      return withCors(request, Response.json({ status: "ok", worker: "goals-ac-read" }));
    }

    if (path.match(/^\/api\/jobs\/[^/]+$/) && request.method === "GET") {
      const jobId = path.split("/").pop()!;
      const status = await kvGetJson(env.AI_CACHE, `job:status:${jobId}`);
      return withCors(
        request,
        Response.json(status ?? { jobId, status: "pending" }),
      );
    }

    const session = await requireAuth(request, env);
    if (!session?.id) {
      return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const userId = Number.parseInt(session.id, 10);

    try {
      if (path === "/api/auth/me" && request.method === "GET") {
        const [user] = await db
          .select({
            id: usersTable.id,
            email: usersTable.email,
            name: usersTable.name,
            role: usersTable.role,
            avatarUrl: usersTable.avatarUrl,
          })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);
        if (!user) {
          return withCors(request, Response.json({ error: "User not found" }, { status: 404 }));
        }
        return withCors(request, Response.json({ user }));
      }

      if (path === "/api/website-projects" && request.method === "GET") {
        const projects = await db
          .select()
          .from(websiteProjectsTable)
          .where(eq(websiteProjectsTable.userId, userId))
          .orderBy(desc(websiteProjectsTable.updatedAt));
        return withCors(request, Response.json(projects));
      }

      if (path === "/api/goals" && request.method === "GET") {
        const goals = await db
          .select()
          .from(goalsTable)
          .where(eq(goalsTable.userId, userId))
          .orderBy(desc(goalsTable.updatedAt));
        return withCors(request, Response.json(goals));
      }

      const contentMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
      if (contentMatch && request.method === "GET") {
        const id = Number.parseInt(contentMatch[1]!, 10);
        const [piece] = await db
          .select()
          .from(contentPiecesTable)
          .where(eq(contentPiecesTable.id, id));
        if (!piece || piece.userId !== userId) {
          return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
        }
        return withCors(request, Response.json(piece));
      }

      if (path === "/api/content-pieces" && request.method === "GET") {
        const pieces = await db
          .select()
          .from(contentPiecesTable)
          .where(eq(contentPiecesTable.userId, userId))
          .orderBy(desc(contentPiecesTable.updatedAt))
          .limit(100);
        return withCors(request, Response.json(pieces));
      }

      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error("[goals-ac-read]", path, err);
      return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
};
