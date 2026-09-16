import { setD1Binding } from "@workspace/db";
import { setJobsQueueBinding } from "@workspace/jobs/cf-queues";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";

/** Secrets/vars copied from the Worker `env` object onto `process.env`. */
export const CF_EDGE_PROCESS_ENV_KEYS = [
  "GEMINI_KEY_ENCRYPTION_SECRET",
  "GEMINI_API_KEY",
  "AI_INTEGRATIONS_GEMINI_API_KEY",
  "AI_INTEGRATIONS_GEMINI_BASE_URL",
  "AI_PROVIDER",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "META_APP_ID",
  "META_APP_SECRET",
  "BLUESKY_OAUTH_PRIVATE_KEY_JWK",
  "BLUESKY_CLIENT_NAME",
  "PUBLISH_ALERT_WEBHOOK_URL",
] as const;

export type CfWorkerProcessEnvKey = (typeof CF_EDGE_PROCESS_ENV_KEYS)[number];

export type CfWorkerEnv = CfEdgeBindings & {
  DB_DIALECT?: string;
} & Partial<Record<CfWorkerProcessEnvKey, string>>;

function applyEnvOverride(name: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) process.env[name] = trimmed;
}

/** Copy Worker bindings onto `process.env`. Does not set `CF_EDGE_HTTP` (jobs must not). */
export function copyCfWorkerProcessEnv(env: Partial<Record<CfWorkerProcessEnvKey, string>>): void {
  for (const key of CF_EDGE_PROCESS_ENV_KEYS) {
    applyEnvOverride(key, env[key]);
  }
}

export function wireCfEdgeEnv(env: CfWorkerEnv): void {
  setD1Binding(env.DB);
  if (env.JOBS_QUEUE) setJobsQueueBinding(env.JOBS_QUEUE);
  process.env.DB_DIALECT = env.DB_DIALECT ?? "d1";
  process.env.CF_EDGE_HTTP = "1";
  copyCfWorkerProcessEnv(env);
}
