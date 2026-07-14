import { getPlatformSettings } from "@/lib/platform/platform-settings";
import { publicSignupsAvailable } from "@/lib/platform/platform-features";
import { SignupPageClient } from "./signup-client";

export default async function SignupPage() {
  const settings = await getPlatformSettings();
  return <SignupPageClient signupsEnabled={publicSignupsAvailable(settings)} />;
}
