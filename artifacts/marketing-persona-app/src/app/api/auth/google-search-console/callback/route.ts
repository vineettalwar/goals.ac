import { handleSearchPropertyCallback } from "@/lib/integrations/oauth/search-property-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return new Response("Google Search Console authorization failed", { status: 400 });
  }

  return handleSearchPropertyCallback("google_search_console", code, state);
}
