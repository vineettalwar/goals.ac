import { resolvePostLoginRedirect } from "@/lib/projects/roadmap-intent";
import { LoginPageClient } from "./login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const postLoginRedirect = resolvePostLoginRedirect(params.next ?? params.callbackUrl);
  return <LoginPageClient postLoginRedirect={postLoginRedirect} />;
}
