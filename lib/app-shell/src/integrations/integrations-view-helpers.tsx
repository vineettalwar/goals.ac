import type { ReactNode } from "react";
import { cn } from "../cn";
import type { ProjectLinkProps } from "../projects/projects-ui";
import { CMS_PLATFORMS, type CmsIntegrationRow, type ProjectIntegrationsTab } from "./types";

export const INTEGRATION_TABS: Array<{ id: ProjectIntegrationsTab; label: string }> = [
  { id: "cms", label: "CMS" },
  { id: "social", label: "Social" },
  { id: "esp", label: "Email" },
  { id: "search", label: "Search & Analytics" },
];

export function IntegrationTabBadge({ count, loading }: { count: number; loading?: boolean }) {
  if (!loading && count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary",
        loading && "invisible",
      )}
      aria-hidden={loading}
    >
      {loading ? 0 : count}
    </span>
  );
}

export function ProjectIntegrationsLink({
  renderLink,
  ...props
}: ProjectLinkProps & { renderLink: (props: ProjectLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function cmsConnectedCount(integrations: Record<string, CmsIntegrationRow>): number {
  let count = 0;
  for (const { key } of CMS_PLATFORMS) {
    if (integrations[key]?.connected) count += 1;
  }
  return count;
}
