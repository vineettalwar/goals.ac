import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  orgAuditLogTable,
  organizationMembersTable,
  platformSettingsTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";

// ── Shared types ──────────────────────────────────────────────────────────────

export type PlatformSettingsPatch = Partial<typeof platformSettingsTable.$inferInsert>;

// ── Response helpers ──────────────────────────────────────────────────────────

export function forbidden(request: Request) {
  return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
}

export function badRequest(request: Request, message: string, details?: unknown) {
  return withCors(
    request,
    Response.json({ error: message, ...(details ? { details } : {}) }, { status: 400 }),
  );
}

export function notFound(request: Request, message = "Not found") {
  return withCors(request, Response.json({ error: message }, { status: 404 }));
}

export function conflict(request: Request, message: string, code?: string) {
  return withCors(
    request,
    Response.json({ error: message, ...(code ? { code } : {}) }, { status: 409 }),
  );
}

export function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export function jsonWithCookie(
  request: Request,
  body: unknown,
  cookie: string,
  status = 200,
): Response {
  return withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }),
  );
}

// ── Shared DB helpers ─────────────────────────────────────────────────────────

export async function upsertPlatformSettingsPatch(patch: PlatformSettingsPatch): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({ target: platformSettingsTable.id, set: patch });
}

export async function logOrgAudit(input: {
  organizationId: number;
  actorUserId: number | null;
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  await db.insert(orgAuditLogTable).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId != null ? String(input.resourceId) : null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
}

export async function getOrgMembership(userId: number) {
  const [row] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);
  return row ?? null;
}
