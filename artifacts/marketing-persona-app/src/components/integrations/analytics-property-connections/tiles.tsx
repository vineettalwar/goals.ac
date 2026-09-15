"use client";

import {
  IntegrationIconBox,
  IntegrationTile,
} from "@/components/integrations/integration-tile";
import type { AnalyticsPropertyConnectionStatus } from "@/lib/integrations/analytics/analytics-property-types";
import { PROVIDER_META } from "./constants";

export function AnalyticsPropertyTiles({
  connections,
  onSelectProvider,
}: {
  connections: AnalyticsPropertyConnectionStatus[];
  onSelectProvider: (provider: AnalyticsPropertyConnectionStatus["provider"]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {connections.map((connection) => {
        const meta = PROVIDER_META[connection.provider];
        const connected = connection.connected && connection.propertyVerified;
        const pending = connection.connected && !connection.propertyVerified;

        return (
          <IntegrationTile
            key={connection.provider}
            icon={<IntegrationIconBox>{meta.icon}</IntegrationIconBox>}
            title={meta.label}
            description={meta.description}
            connected={connected || pending}
            pending={pending}
            summary={
              connected
                ? connection.propertyName ?? connection.accountEmail
                : pending
                  ? "Pick a GA4 property"
                  : null
            }
            onClick={() => onSelectProvider(connection.provider)}
          />
        );
      })}
    </div>
  );
}
