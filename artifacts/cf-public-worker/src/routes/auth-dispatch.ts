import { withCors } from "@workspace/cf-edge/cors";
import {
  handleAuthLogin,
  handleAuthLogout,
  handleAuthSignup,
} from "../auth";
import {
  handleAuthForgotPassword,
  handleAuthResetPassword,
} from "../auth-password-reset";
import { handleGoogleAuthCallback, handleGoogleAuthStart } from "../auth-google";
import { handleGscAuthCallback, handleGscAuthStart } from "../auth-gsc";
import {
  handleGoogleSheetsAuthCallback,
  handleGoogleSheetsAuthStart,
} from "../auth-google-sheets";
import { handleBingAuthCallback, handleBingAuthStart } from "../auth-bing";
import {
  handleGoogleAnalyticsAuthCallback,
  handleGoogleAnalyticsAuthStart,
} from "../auth-google-analytics";
import { handleLinkedInAuthCallback, handleLinkedInAuthStart } from "../auth-linkedin";
import { handleTwitterAuthCallback, handleTwitterAuthStart } from "../auth-twitter";
import { handleMetaAuthCallback, handleMetaAuthStart } from "../auth-meta";
import { handleMetaPagesList, handleMetaSelectPage } from "../auth-meta-pages";
import {
  getBlueskyClientMetadata,
  getBlueskyJwks,
  handleBlueskyAuthCallback,
  handleBlueskyAuthStart,
} from "../auth-bluesky";
import { handleMastodonAuthCallback, handleMastodonAuthStart } from "../auth-mastodon";
import { handleStripeWebhook } from "../stripe-webhook";
import { clientIp, db, rateLimitKv } from "../http";
import type { Env } from "../env";

export async function handleAuthDispatch(
  request: Request,
  path: string,
  env: Env,
): Promise<Response | null> {
  if (path === "/api/auth/login" && request.method === "POST") {
    const ip = clientIp(request);
    if (await rateLimitKv(env, `auth-login:${ip}`, 20, 900)) {
      return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
    }
    const response = await handleAuthLogin(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/signup" && request.method === "POST") {
    const ip = clientIp(request);
    if (await rateLimitKv(env, `auth-signup:${ip}`, 10, 3600)) {
      return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
    }
    const response = await handleAuthSignup(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    const response = handleAuthLogout(request);
    return withCors(request, response);
  }

  if (path === "/api/auth/forgot-password" && request.method === "POST") {
    const ip = clientIp(request);
    if (await rateLimitKv(env, `auth-forgot-password:${ip}`, 10, 3600)) {
      return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
    }
    const response = await handleAuthForgotPassword(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/reset-password" && request.method === "POST") {
    const ip = clientIp(request);
    if (await rateLimitKv(env, `auth-reset-password:${ip}`, 20, 900)) {
      return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
    }
    const response = await handleAuthResetPassword(request, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google" && request.method === "GET") {
    const response = await handleGoogleAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/google/callback" && request.method === "GET") {
    const response = await handleGoogleAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/linkedin" && request.method === "GET") {
    const response = await handleLinkedInAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/linkedin/callback" && request.method === "GET") {
    const response = await handleLinkedInAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/twitter" && request.method === "GET") {
    const response = await handleTwitterAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/twitter/callback" && request.method === "GET") {
    const response = await handleTwitterAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/meta" && request.method === "GET") {
    const response = await handleMetaAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/meta/callback" && request.method === "GET") {
    const response = await handleMetaAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/meta/pages" && request.method === "GET") {
    const response = await handleMetaPagesList(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/meta/select-page" && request.method === "POST") {
    const response = await handleMetaSelectPage(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/bluesky" && request.method === "GET") {
    const response = await handleBlueskyAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/bluesky/callback" && request.method === "GET") {
    const response = await handleBlueskyAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/mastodon" && request.method === "GET") {
    const response = await handleMastodonAuthStart(request, env);
    return withCors(request, response);
  }

  if (path === "/api/auth/mastodon/callback" && request.method === "GET") {
    const response = await handleMastodonAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/oauth/bluesky-client-metadata.json" && request.method === "GET") {
    try {
      const metadata = await getBlueskyClientMetadata(request, env);
      return withCors(
        request,
        Response.json(metadata, {
          headers: { "Cache-Control": "public, max-age=3600" },
        }),
      );
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
          { status: 503 },
        ),
      );
    }
  }

  if (path === "/oauth/bluesky-jwks.json" && request.method === "GET") {
    try {
      const jwks = await getBlueskyJwks(request, env);
      return withCors(
        request,
        Response.json(jwks, {
          headers: { "Cache-Control": "public, max-age=3600" },
        }),
      );
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
          { status: 503 },
        ),
      );
    }
  }

  if (path === "/api/auth/google-search-console" && request.method === "GET") {
    const response = await handleGscAuthStart(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google-search-console/callback" && request.method === "GET") {
    const response = await handleGscAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/bing-webmaster" && request.method === "GET") {
    const response = await handleBingAuthStart(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/bing-webmaster/callback" && request.method === "GET") {
    const response = await handleBingAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google-analytics" && request.method === "GET") {
    const response = await handleGoogleAnalyticsAuthStart(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google-analytics/callback" && request.method === "GET") {
    const response = await handleGoogleAnalyticsAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google-sheets" && request.method === "GET") {
    const response = await handleGoogleSheetsAuthStart(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/auth/google-sheets/callback" && request.method === "GET") {
    const response = await handleGoogleSheetsAuthCallback(request, env, db());
    return withCors(request, response);
  }

  if (path === "/api/webhooks/stripe" && request.method === "POST") {
    return handleStripeWebhook(request);
  }

  return null;
}
