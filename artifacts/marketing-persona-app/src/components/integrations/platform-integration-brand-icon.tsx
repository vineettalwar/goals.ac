import { PublishBrandIcon, type PublishBrandIconId } from "@workspace/app-shell/integrations";
import type { PlatformIntegrationId } from "@/lib/platform/platform-features";

export function PlatformIntegrationBrandIcon({
  id,
  className,
}: {
  id: PlatformIntegrationId;
  className?: string;
}) {
  return <PublishBrandIcon id={id as PublishBrandIconId} className={className} />;
}
