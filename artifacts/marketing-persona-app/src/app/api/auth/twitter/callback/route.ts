import { handleTwitterCallback } from "@/lib/integrations/oauth/social-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return new Response("X authorization failed", { status: 400 });
  }

  return handleTwitterCallback(code, state);
}
