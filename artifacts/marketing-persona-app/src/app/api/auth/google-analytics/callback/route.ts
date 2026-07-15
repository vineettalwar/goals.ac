import { handleGoogleAnalyticsCallback } from "@/lib/integrations/oauth/analytics-property-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return new Response("Google Analytics authorization failed", { status: 400 });
  }

  return handleGoogleAnalyticsCallback(code, state);
}
