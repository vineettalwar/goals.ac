import { getPlatformSettings } from "@/lib/platform/platform-settings";
import { publicSignupsAvailable } from "@/lib/platform/platform-features";
import { sanitizeRedirectPath } from "@/lib/projects/roadmap-intent";
import { SignupPageClient } from "./signup-client";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const settings = await getPlatformSettings();
  const params = await searchParams;
  const callbackUrl = sanitizeRedirectPath(params.callbackUrl);
  return (
    <SignupPageClient
      signupsEnabled={publicSignupsAvailable(settings)}
      callbackUrl={callbackUrl}
    />
  );
}
