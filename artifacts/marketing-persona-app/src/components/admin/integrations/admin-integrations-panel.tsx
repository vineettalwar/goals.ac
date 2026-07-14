"use client";

import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import {
  IntegrationIconBox,
  IntegrationTile,
} from "@/components/integrations/integration-tile";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-secrets";
import {
  type IntegrationEnvStatus,
  type PlatformIntegrationCategoryId,
  type PlatformIntegrationDefinition,
  type PlatformIntegrationId,
} from "@/lib/platform/platform-features";
import {
  isIntegrationActive,
  isIntegrationConfigured,
  isIntegrationEnabled,
  isIntegrationPending,
  isIntegrationManagedByEnv,
  getIntegrationLastFour,
  integrationSummary,
  type PlatformSettingsResponse,
} from "./admin-integrations-helpers";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";

export type { AdminIntegrationsCounts } from "./admin-integrations-helpers";

function IntegrationTilesGrid({
  definitions,
  settings,
  env,
  status,
  onSelect,
}: {
  definitions: PlatformIntegrationDefinition[];
  settings: PlatformSettingsResponse;
  env: IntegrationEnvStatus;
  status: PlatformIntegrationStatus;
  onSelect: (id: PlatformIntegrationId) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {definitions.map((definition) => {
        const configured = isIntegrationConfigured(definition, env, status);
        const enabled = isIntegrationEnabled(definition, settings);
        const active = isIntegrationActive(definition, settings, env, status);
        const pending = isIntegrationPending(definition, settings, env, status);
        const managedByEnv = isIntegrationManagedByEnv(definition, status);
        const summary = integrationSummary(
          configured,
          enabled,
          active,
          getIntegrationLastFour(definition, status),
          managedByEnv,
        );

        return (
          <IntegrationTile
            key={definition.id}
            compact
            icon={
              <IntegrationIconBox className="border-0 bg-transparent p-0">
                <PlatformIntegrationBrandIcon id={definition.id} />
              </IntegrationIconBox>
            }
            title={definition.label}
            description={definition.description}
            connected={active}
            pending={pending}
            summary={summary}
            onClick={() => onSelect(definition.id)}
          />
        );
      })}
    </div>
  );
}

function IntegrationsHintBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
      <p className="text-sm text-muted-foreground">
        Click an integration to connect or manage settings.
      </p>
    </div>
  );
}

export function AdminIntegrationsContent({
  controller,
  activeTab,
}: {
  controller: AdminIntegrationsController;
  activeTab: PlatformIntegrationCategoryId;
}) {
  const { settings, env, status, groupedIntegrations, setActiveDialog } = controller;
  if (!settings || !env || !status) return null;

  const group = groupedIntegrations.find((entry) => entry.category.id === activeTab);
  if (!group) return null;

  return (
    <div className="space-y-6">
      <IntegrationsHintBar />
      <IntegrationTilesGrid
        definitions={group.integrations}
        settings={settings}
        env={env}
        status={status}
        onSelect={setActiveDialog}
      />
    </div>
  );
}
