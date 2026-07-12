import { handleMastodonCallback } from "@/lib/social-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    throw new Error("Missing OAuth parameters");
  }

  await handleMastodonCallback(code, state);
}
