import { PublishBrandIcon, type PublishBrandIconId } from "@workspace/app-shell";
import type { PlatformIntegrationId } from "./types";

export function PlatformIntegrationBrandIcon({
  id,
  className,
}: {
  id: PlatformIntegrationId;
  className?: string;
}) {
  return <PublishBrandIcon id={id as PublishBrandIconId} className={className} />;
}
