import crypto from "node:crypto";
import { db, apiKeysTable, websiteProjectsTable, type ApiKeyScope } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

export interface AuthenticatedApiKey {
  id: number;
  organizationId: number;
  scopes: ApiKeyScope[];
  rateLimitPerHour: number;
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = `gac_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  return { rawKey, prefix, hash: hashApiKey(rawKey) };
}

export async function authenticateApiKey(
  authorizationHeader: string | undefined,
): Promise<AuthenticatedApiKey | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const rawKey = authorizationHeader.slice("Bearer ".length).trim();
  if (!rawKey.startsWith("gac_")) return null;

  const keyHash = hashApiKey(rawKey);
  const [row] = await db
    .select({
      id: apiKeysTable.id,
      organizationId: apiKeysTable.organizationId,
      scopes: apiKeysTable.scopes,
      rateLimitPerHour: apiKeysTable.rateLimitPerHour,
    })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, keyHash), isNull(apiKeysTable.revokedAt)))
    .limit(1);

  if (!row) return null;

  await db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, row.id));

  return {
    id: row.id,
    organizationId: row.organizationId,
    scopes: row.scopes ?? ["render:preview"],
    rateLimitPerHour: row.rateLimitPerHour,
  };
}

export function requireApiKeyScope(
  key: AuthenticatedApiKey,
  scope: ApiKeyScope,
): void {
  if (!key.scopes.includes(scope)) {
    throw new Error(`API key missing required scope: ${scope}`);
  }
}

export async function assertProjectInOrg(
  projectId: number,
  organizationId: number,
): Promise<void> {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(
      and(
        eq(websiteProjectsTable.id, projectId),
        eq(websiteProjectsTable.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project not found");
}

/** In-memory rate limit bucket keyed by api key id + hour window */
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkApiKeyRateLimit(key: AuthenticatedApiKey): boolean {
  const hourMs = 60 * 60 * 1000;
  const windowStart = Math.floor(Date.now() / hourMs) * hourMs;
  const bucketKey = `${key.id}:${windowStart}`;
  const bucket = rateBuckets.get(bucketKey) ?? { count: 0, windowStart };
  if (bucket.windowStart !== windowStart) {
    bucket.count = 0;
    bucket.windowStart = windowStart;
  }
  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);
  return bucket.count <= key.rateLimitPerHour;
}
