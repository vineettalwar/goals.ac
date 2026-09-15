"use client";

import type { ReactNode } from "react";
import { MetricRow } from "../section-panels/shared";
import { formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-format";
import type { DashboardCommandCenter, DashboardLinkProps } from "./types";

export { formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-format";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

export function OutcomesPanel({
  projectId,
  commandCenter,
  renderLink,
}: {
  projectId: number;
  commandCenter: DashboardCommandCenter;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  const published = commandCenter.publishedCount ?? 0;
  const drafts = commandCenter.draftCount ?? commandCenter.draftsNeedingReview ?? 0;
  const health = commandCenter.publishHealth ?? { ok: 0, failed: 0, lastAt: null };
  const geoTrend = formatGeoTrend(commandCenter.latestGeoScore, commandCenter.previousGeoScore);
  const citation =
    commandCenter.llmCitationRate != null ? `${commandCenter.llmCitationRate}%` : "—";
  const citationDelta = formatCitationDelta(commandCenter.llmCitationDelta);

  return (
    <section aria-labelledby="outcomes-heading">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 id="outcomes-heading" className="text-sm font-semibold tracking-tight">
          Outcomes
        </h2>
        <DashLink
          renderLink={renderLink}
          href={`/projects/${projectId}/content-studio`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Studio
        </DashLink>
      </div>
      <MetricRow
        items={[
          { label: "live", value: published },
          { label: "drafts", value: drafts },
          { label: "publish", value: formatPublishHealth(health) },
          { label: "citations", value: citationDelta ? `${citation} (${citationDelta})` : citation },
          {
            label: "GEO",
            value:
              commandCenter.latestGeoScore != null
                ? `${commandCenter.latestGeoScore}${geoTrend ? ` ${geoTrend}` : ""}`
                : "—",
          },
        ]}
      />
    </section>
  );
}
