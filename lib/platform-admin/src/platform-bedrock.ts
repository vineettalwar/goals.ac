import { db } from "./db";
import {
  organizationsTable,
  platformBedrockOrgGrantsTable,
  platformSettingsTable,
} from "@workspace/db/schema-sqlite";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import { and, eq, inArray } from "drizzle-orm";
import { lastFour } from "@workspace/billing";

export type PlatformBedrockCredentials = {
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
  model?: string;
};

const BEDROCK_ENV_VARS = [
  "AWS_BEARER_TOKEN_BEDROCK",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "BEDROCK_MODEL",
] as const;

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function activeEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => Boolean(process.env[name]?.trim()));
}

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}

export function isBedrockManagedByEnv(): boolean {
  return Boolean(
    envTrim("AWS_BEARER_TOKEN_BEDROCK") ||
      (envTrim("AWS_ACCESS_KEY_ID") && envTrim("AWS_SECRET_ACCESS_KEY")),
  );
}

export type PlatformBedrockStatus = {
  managedByEnv: boolean;
  envVars: string[];
  accessKeyId: { configured: boolean; source: "db" | "env" | null; lastFour: string | null };
  secretAccessKey: { configured: boolean; source: "db" | "env" | null; lastFour: string | null };
  hasSessionToken: boolean;
  region: { configured: boolean; value: string | null; source: "db" | "env" | null };
  model: { configured: boolean; value: string | null; source: "db" | "env" | null };
  configured: boolean;
  grantedOrganizations: Array<{ id: number; name: string }>;
};

function secretFieldStatus(
  dbEncrypted: string | null | undefined,
  envName: string,
): { configured: boolean; source: "db" | "env" | null; lastFour: string | null } {
  const fromEnv = envTrim(envName);
  if (fromEnv) {
    return { configured: true, source: "env", lastFour: lastFour(fromEnv) };
  }
  const fromDb = safeDecrypt(dbEncrypted);
  if (fromDb) {
    return { configured: true, source: "db", lastFour: lastFour(fromDb) };
  }
  return { configured: false, source: null, lastFour: null };
}

function plainFieldStatus(
  dbValue: string | null | undefined,
  envNames: readonly string[],
): { configured: boolean; value: string | null; source: "db" | "env" | null } {
  for (const envName of envNames) {
    const fromEnv = envTrim(envName);
    if (fromEnv) {
      return { configured: true, value: fromEnv, source: "env" };
    }
  }
  const trimmedDb = dbValue?.trim();
  if (trimmedDb) {
    return { configured: true, value: trimmedDb, source: "db" };
  }
  return { configured: false, value: null, source: null };
}

export async function listPlatformBedrockGrantedOrganizations(): Promise<
  Array<{ id: number; name: string }>
> {
  const rows = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
    })
    .from(platformBedrockOrgGrantsTable)
    .innerJoin(
      organizationsTable,
      eq(organizationsTable.id, platformBedrockOrgGrantsTable.organizationId),
    );

  return rows;
}

export async function isOrgGrantedPlatformBedrock(organizationId: number): Promise<boolean> {
  const [row] = await db
    .select({ organizationId: platformBedrockOrgGrantsTable.organizationId })
    .from(platformBedrockOrgGrantsTable)
    .where(eq(platformBedrockOrgGrantsTable.organizationId, organizationId))
    .limit(1);
  return Boolean(row);
}

/** Platform Bedrock material (env overrides DB). Does not check org grants. */
export async function loadPlatformBedrockCredentials(): Promise<PlatformBedrockCredentials | null> {
  const envBearer = envTrim("AWS_BEARER_TOKEN_BEDROCK");
  if (envBearer) {
    return {
      apiKey: envBearer,
      region: envTrim("AWS_REGION") ?? envTrim("AWS_DEFAULT_REGION") ?? undefined,
      model: envTrim("BEDROCK_MODEL") ?? undefined,
    };
  }

  const envAccessKeyId = envTrim("AWS_ACCESS_KEY_ID");
  const envSecretAccessKey = envTrim("AWS_SECRET_ACCESS_KEY");
  if (envAccessKeyId && envSecretAccessKey) {
    return {
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      sessionToken: envTrim("AWS_SESSION_TOKEN") ?? undefined,
      region: envTrim("AWS_REGION") ?? envTrim("AWS_DEFAULT_REGION") ?? undefined,
      model: envTrim("BEDROCK_MODEL") ?? undefined,
    };
  }

  const [row] = await db
    .select({
      encryptedBedrockAccessKeyId: platformSettingsTable.encryptedBedrockAccessKeyId,
      encryptedBedrockSecretAccessKey: platformSettingsTable.encryptedBedrockSecretAccessKey,
      encryptedBedrockSessionToken: platformSettingsTable.encryptedBedrockSessionToken,
      bedrockRegion: platformSettingsTable.bedrockRegion,
      bedrockModel: platformSettingsTable.bedrockModel,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const accessKeyId = safeDecrypt(row?.encryptedBedrockAccessKeyId);
  const secretAccessKey = safeDecrypt(row?.encryptedBedrockSecretAccessKey);
  if (!secretAccessKey) return null;

  const region = row?.bedrockRegion ?? undefined;
  const model = row?.bedrockModel ?? undefined;

  if (!accessKeyId) {
    return { apiKey: secretAccessKey, region, model };
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: safeDecrypt(row?.encryptedBedrockSessionToken) ?? undefined,
    region,
    model,
  };
}

/**
 * Platform Bedrock for a granted org. Returns null when the org is not granted
 * or platform credentials are missing.
 */
export async function resolvePlatformBedrockCredentialsForOrg(
  organizationId: number,
): Promise<PlatformBedrockCredentials | null> {
  if (!(await isOrgGrantedPlatformBedrock(organizationId))) return null;
  return loadPlatformBedrockCredentials();
}

export async function getPlatformBedrockStatus(): Promise<PlatformBedrockStatus> {
  const [row] = await db
    .select({
      encryptedBedrockAccessKeyId: platformSettingsTable.encryptedBedrockAccessKeyId,
      encryptedBedrockSecretAccessKey: platformSettingsTable.encryptedBedrockSecretAccessKey,
      encryptedBedrockSessionToken: platformSettingsTable.encryptedBedrockSessionToken,
      bedrockRegion: platformSettingsTable.bedrockRegion,
      bedrockModel: platformSettingsTable.bedrockModel,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const envBearer = envTrim("AWS_BEARER_TOKEN_BEDROCK");
  const accessKeyId = secretFieldStatus(row?.encryptedBedrockAccessKeyId, "AWS_ACCESS_KEY_ID");
  const secretAccessKey = envBearer
    ? { configured: true as const, source: "env" as const, lastFour: lastFour(envBearer) }
    : secretFieldStatus(row?.encryptedBedrockSecretAccessKey, "AWS_SECRET_ACCESS_KEY");
  const region = plainFieldStatus(row?.bedrockRegion, ["AWS_REGION", "AWS_DEFAULT_REGION"]);
  const model = plainFieldStatus(row?.bedrockModel, ["BEDROCK_MODEL"]);
  const grantedOrganizations = await listPlatformBedrockGrantedOrganizations();

  return {
    managedByEnv: isBedrockManagedByEnv(),
    envVars: activeEnvVars(BEDROCK_ENV_VARS),
    accessKeyId,
    secretAccessKey,
    hasSessionToken: Boolean(
      envTrim("AWS_SESSION_TOKEN") || safeDecrypt(row?.encryptedBedrockSessionToken),
    ),
    region,
    model,
    configured: Boolean(envBearer) || secretAccessKey.configured,
    grantedOrganizations,
  };
}

export type SavePlatformBedrockCredentialsInput = {
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string | null;
  region?: string | null;
  model?: string | null;
  updatedBy: number;
};

export async function savePlatformBedrockCredentials(
  input: SavePlatformBedrockCredentialsInput,
): Promise<void> {
  if (isBedrockManagedByEnv()) {
    throw new Error("Bedrock credentials are managed via server environment variables");
  }

  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    const trimmed = input.apiKey.trim();
    patch.encryptedBedrockSecretAccessKey = trimmed ? encryptSecret(trimmed) : null;
    patch.encryptedBedrockAccessKeyId = null;
    patch.encryptedBedrockSessionToken = null;
  } else {
    if (input.accessKeyId !== undefined) {
      patch.encryptedBedrockAccessKeyId = input.accessKeyId
        ? encryptSecret(input.accessKeyId.trim())
        : null;
    }
    if (input.secretAccessKey !== undefined) {
      patch.encryptedBedrockSecretAccessKey = input.secretAccessKey
        ? encryptSecret(input.secretAccessKey.trim())
        : null;
    }
    if (input.sessionToken !== undefined) {
      const trimmed = input.sessionToken?.trim();
      patch.encryptedBedrockSessionToken = trimmed ? encryptSecret(trimmed) : null;
    }
  }

  if (input.region !== undefined) {
    patch.bedrockRegion = input.region?.trim() || null;
  }
  if (input.model !== undefined) {
    patch.bedrockModel = input.model?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredPlatformBedrockCredentials(updatedBy: number): Promise<void> {
  if (isBedrockManagedByEnv()) {
    throw new Error("Bedrock credentials are managed via server environment variables");
  }
  await savePlatformBedrockCredentials({
    apiKey: "",
    region: null,
    model: null,
    updatedBy,
  });
}

/** Replace the set of orgs granted platform Bedrock access. */
export async function setPlatformBedrockOrgGrants(
  organizationIds: number[],
  grantedBy: number,
): Promise<void> {
  const uniqueIds = [...new Set(organizationIds.filter((id) => Number.isInteger(id) && id > 0))];

  if (uniqueIds.length > 0) {
    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(inArray(organizationsTable.id, uniqueIds));
    const existingIds = new Set(existing.map((row) => row.id));
    const missing = uniqueIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new Error(`Unknown organization ids: ${missing.join(", ")}`);
    }
  }

  const current = await db
    .select({ organizationId: platformBedrockOrgGrantsTable.organizationId })
    .from(platformBedrockOrgGrantsTable);
  const currentIds = current.map((row) => row.organizationId);
  const nextSet = new Set(uniqueIds);

  const toRemove = currentIds.filter((id) => !nextSet.has(id));
  if (toRemove.length > 0) {
    await db
      .delete(platformBedrockOrgGrantsTable)
      .where(inArray(platformBedrockOrgGrantsTable.organizationId, toRemove));
  }

  const toAdd = uniqueIds.filter((id) => !currentIds.includes(id));
  if (toAdd.length > 0) {
    await db.insert(platformBedrockOrgGrantsTable).values(
      toAdd.map((organizationId) => ({
        organizationId,
        grantedBy,
        grantedAt: new Date(),
      })),
    );
  }
}

export async function grantPlatformBedrockToOrg(
  organizationId: number,
  grantedBy: number,
): Promise<void> {
  const [org] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  if (!org) throw new Error("Organization not found");

  await db
    .insert(platformBedrockOrgGrantsTable)
    .values({
      organizationId,
      grantedBy,
      grantedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformBedrockOrgGrantsTable.organizationId,
      set: { grantedBy, grantedAt: new Date() },
    });
}

export async function revokePlatformBedrockFromOrg(organizationId: number): Promise<void> {
  await db
    .delete(platformBedrockOrgGrantsTable)
    .where(and(eq(platformBedrockOrgGrantsTable.organizationId, organizationId)));
}
