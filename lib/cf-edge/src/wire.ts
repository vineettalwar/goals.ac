import { setD1Binding } from "@workspace/db";
import { setJobsQueueBinding } from "@workspace/jobs/cf-queues";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";

export type CfWorkerEnv = CfEdgeBindings & {
  DB_DIALECT?: string;
  GEMINI_KEY_ENCRYPTION_SECRET?: string;
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  BLUESKY_OAUTH_PRIVATE_KEY_JWK?: string;
  BLUESKY_CLIENT_NAME?: string;
};

function applyEnvOverride(name: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) process.env[name] = trimmed;
}

export function wireCfEdgeEnv(env: CfWorkerEnv): void {
  setD1Binding(env.DB);
  if (env.JOBS_QUEUE) setJobsQueueBinding(env.JOBS_QUEUE);
  process.env.DB_DIALECT = env.DB_DIALECT ?? "d1";
  process.env.CF_EDGE_HTTP = "1";
  applyEnvOverride("GEMINI_KEY_ENCRYPTION_SECRET", env.GEMINI_KEY_ENCRYPTION_SECRET);
  applyEnvOverride("DATAFORSEO_LOGIN", env.DATAFORSEO_LOGIN);
  applyEnvOverride("DATAFORSEO_PASSWORD", env.DATAFORSEO_PASSWORD);
  // Social OAuth: Worker bindings → process.env so content-engine resolvers keep env-over-DB.
  applyEnvOverride("LINKEDIN_CLIENT_ID", env.LINKEDIN_CLIENT_ID);
  applyEnvOverride("LINKEDIN_CLIENT_SECRET", env.LINKEDIN_CLIENT_SECRET);
  applyEnvOverride("TWITTER_CLIENT_ID", env.TWITTER_CLIENT_ID);
  applyEnvOverride("TWITTER_CLIENT_SECRET", env.TWITTER_CLIENT_SECRET);
  applyEnvOverride("META_APP_ID", env.META_APP_ID);
  applyEnvOverride("META_APP_SECRET", env.META_APP_SECRET);
  applyEnvOverride("BLUESKY_OAUTH_PRIVATE_KEY_JWK", env.BLUESKY_OAUTH_PRIVATE_KEY_JWK);
  applyEnvOverride("BLUESKY_CLIENT_NAME", env.BLUESKY_CLIENT_NAME);
}
