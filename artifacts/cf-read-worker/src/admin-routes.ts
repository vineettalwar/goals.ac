import { withCors } from "@workspace/cf-edge/cors";
import {
  getAdminOverview,
  getOrganizationAdminDetail,
  getAdminContentStrategyDetail,
  getPlatformIntegrationStatus,
  getPlatformSettings,
  getPlatformStats,
  isPlatformAdmin,
  listAdminContentStrategies,
  listAllOrganizations,
  listAllUsers,
  listOrganizationOptions,
  listPendingInvites,
} from "@workspace/platform-admin";
import {
  getIntegrationEnvStatus,
  getPlatformIntegrationDefinitions,
} from "@workspace/platform-admin";
import {
  adminIntegrationsAppUrl,
  buildStripeConnectAuthorizeUrl,
  decodeStripeConnectState,
  exchangeStripeConnectCode,
  saveStripeConnectTokens,
  type StripeConnectEnv,
} from "@workspace/platform-admin";
import { loadPlanQuotaLimits } from "@workspace/billing";

function forbidden(request: Request) {
  return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
}

function badRequest(request: Request, message: string) {
  return withCors(request, Response.json({ error: message }, { status: 400 }));
}

function notFound(request: Request) {
  return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
}

export type AdminReadEnv = {
  AUTH_SECRET: string;
  STRIPE_CONNECT_CLIENT_ID?: string;
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

function redirectResponse(request: Request, location: string): Response {
  return withCors(request, new Response(null, { status: 302, headers: { Location: location } }));
}

function stripeConnectEnv(request: Request, env: AdminReadEnv): StripeConnectEnv {
  const apiOrigin = new URL(request.url).origin;
  const appOrigin =
    env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "https://app.goals.ac";
  return {
    authSecret: env.AUTH_SECRET,
    stripeConnectClientId: env.STRIPE_CONNECT_CLIENT_ID,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    apiOrigin,
    appOrigin,
  };
}

export async function handleAdminRead(
  request: Request,
  path: string,
  userRole: string | null | undefined,
  userId: number,
  env: AdminReadEnv,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin")) return null;
  if (!isPlatformAdmin(userRole)) return forbidden(request);

  const url = new URL(request.url);
  const method = request.method;

  if (path === "/api/admin/overview" && method === "GET") {
    const overview = await getAdminOverview();
    return withCors(request, Response.json(overview));
  }

  if (path === "/api/admin/stats" && method === "GET") {
    const stats = await getPlatformStats();
    return withCors(request, Response.json({ stats }));
  }

  if (path === "/api/admin/platform-settings" && method === "GET") {
    const [settings, env, integrations] = await Promise.all([
      getPlatformSettings(),
      Promise.resolve(getIntegrationEnvStatus()),
      Promise.resolve(getPlatformIntegrationDefinitions()),
    ]);
    return withCors(request, Response.json({ ...settings, env, integrations }));
  }

  if (path === "/api/admin/plan-quotas" && method === "GET") {
    const limits = await loadPlanQuotaLimits();
    return withCors(request, Response.json({ limits }));
  }

  if (path === "/api/admin/users" && method === "GET") {
    const search = url.searchParams.get("search") ?? undefined;
    const platformRole = url.searchParams.get("platformRole") ?? undefined;
    const organizationIdRaw = url.searchParams.get("organizationId");
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");

    const organizationId =
      organizationIdRaw != null ? Number.parseInt(organizationIdRaw, 10) : undefined;
    const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw != null ? Number.parseInt(offsetRaw, 10) : undefined;

    if (organizationIdRaw != null && !Number.isFinite(organizationId)) {
      return badRequest(request, "Invalid organizationId");
    }
    if (limitRaw != null && !Number.isFinite(limit)) {
      return badRequest(request, "Invalid limit");
    }
    if (offsetRaw != null && !Number.isFinite(offset)) {
      return badRequest(request, "Invalid offset");
    }

    const result = await listAllUsers({ search, platformRole, organizationId, limit, offset });
    return withCors(request, Response.json(result));
  }

  if (path === "/api/admin/organizations" && method === "GET") {
    if (url.searchParams.get("minimal") === "true") {
      const organizations = await listOrganizationOptions();
      return withCors(request, Response.json({ organizations }));
    }
    const organizations = await listAllOrganizations();
    return withCors(request, Response.json({ organizations }));
  }

  const orgDetailMatch = path.match(/^\/api\/admin\/organizations\/(\d+)$/);
  if (orgDetailMatch && method === "GET") {
    const orgId = Number.parseInt(orgDetailMatch[1]!, 10);
    if (!Number.isFinite(orgId) || orgId <= 0) return badRequest(request, "Invalid organization id");

    const detail = await getOrganizationAdminDetail(orgId);
    if (!detail) return notFound(request);

    return withCors(request, Response.json(detail));
  }

  if (path === "/api/admin/invites" && method === "GET") {
    const invites = await listPendingInvites();
    return withCors(request, Response.json({ invites }));
  }

  if (path === "/api/admin/content-strategies" && method === "GET") {
    const search = url.searchParams.get("search") ?? undefined;
    const orgIdParam = url.searchParams.get("organizationId");
    const organizationId =
      orgIdParam && orgIdParam !== "all" ? Number.parseInt(orgIdParam, 10) : undefined;
    const unlinkedOnly = url.searchParams.get("unlinkedOnly") === "true";

    const strategies = await listAdminContentStrategies({
      search,
      organizationId: organizationId && !Number.isNaN(organizationId) ? organizationId : undefined,
      unlinkedOnly,
    });
    return withCors(request, Response.json({ strategies, total: strategies.length }));
  }

  const contentStrategyMatch = path.match(/^\/api\/admin\/content-strategies\/(\d+)$/);
  if (contentStrategyMatch && method === "GET") {
    const strategyId = Number.parseInt(contentStrategyMatch[1]!, 10);
    if (Number.isNaN(strategyId)) return badRequest(request, "Invalid strategy id");

    const strategy = await getAdminContentStrategyDetail(strategyId);
    if (!strategy) return notFound(request);

    return withCors(request, Response.json({ strategy }));
  }

  if (path === "/api/admin/platform-integrations" && method === "GET") {
    const status = await getPlatformIntegrationStatus();
    return withCors(request, Response.json(status));
  }

  if (path === "/api/admin/stripe-connect" && method === "GET") {
    const connectEnv = stripeConnectEnv(request, env);
    const authorizeUrl = buildStripeConnectAuthorizeUrl(userId, connectEnv);
    if (!authorizeUrl) {
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, { stripe: "connect_unconfigured" }),
      );
    }
    return redirectResponse(request, authorizeUrl);
  }

  if (path === "/api/admin/stripe-connect/callback" && method === "GET") {
    const connectEnv = stripeConnectEnv(request, env);
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, {
          stripe: "connect_error",
          message: errorDescription ?? error,
        }),
      );
    }

    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    if (!code || !stateRaw) {
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, {
          stripe: "connect_error",
          message: "Missing OAuth code",
        }),
      );
    }

    const state = decodeStripeConnectState(stateRaw, env.AUTH_SECRET);
    if (!state || state.userId !== userId) {
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, {
          stripe: "connect_error",
          message: "Invalid OAuth state",
        }),
      );
    }

    try {
      const tokens = await exchangeStripeConnectCode(code, connectEnv);
      await saveStripeConnectTokens(tokens, userId);
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, { stripe: "connected" }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connect failed";
      return redirectResponse(
        request,
        adminIntegrationsAppUrl(connectEnv.appOrigin, {
          stripe: "connect_error",
          message,
        }),
      );
    }
  }

  return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
}
