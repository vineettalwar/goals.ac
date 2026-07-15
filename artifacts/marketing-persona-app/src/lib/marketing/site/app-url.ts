/** Product app origin for login/signup links from the marketing site. */

export type DeployStage = "production" | "staging" | "development";

const STAGE_APP_ORIGINS: Record<DeployStage, string> = {
  production: "https://app.goals.ac",
  staging: "https://goals-ac-app.pages.dev",
  development: "http://localhost:3001",
};

export function resolveDeployStage(): DeployStage {
  const explicit = process.env.NEXT_PUBLIC_DEPLOY_STAGE?.trim().toLowerCase();
  if (explicit === "production" || explicit === "staging" || explicit === "development") {
    return explicit;
  }
  if (process.env.NODE_ENV === "development") return "development";
  return "production";
}

function originFromMarketingHost(host: string): string | null {
  if (host === "goals.ac" || host === "www.goals.ac") {
    return STAGE_APP_ORIGINS.production;
  }
  if (host.endsWith(".goals-ac-marketing.pages.dev")) {
    return STAGE_APP_ORIGINS.staging;
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return (
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
      STAGE_APP_ORIGINS.development
    );
  }
  return null;
}

/** Resolve the product app origin for the current deploy stage / host. */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const fromHost = originFromMarketingHost(window.location.hostname);
    if (fromHost) return fromHost;
  }

  if (process.env.MARKETING_STATIC === "1") {
    return STAGE_APP_ORIGINS[resolveDeployStage()];
  }

  return "";
}

export function loginHref(): string {
  const origin = getAppOrigin();
  return origin ? `${origin}/login` : "/login";
}

export function signupHref(query?: string): string {
  const origin = getAppOrigin();
  const base = origin ? `${origin}/signup` : "/signup";
  return query ? `${base}?${query}` : base;
}

/** Navigate to signup; uses full navigation when the app is on another origin. */
export function goToSignup(
  router: { push: (href: string) => void },
  query?: string,
): void {
  const href = signupHref(query);
  if (href.startsWith("http")) {
    window.location.href = href;
    return;
  }
  router.push(href);
}
