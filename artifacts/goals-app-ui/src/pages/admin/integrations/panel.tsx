import { IntegrationIconBox, IntegrationTile } from "@workspace/app-shell";
import type { PlatformIntegrationCategoryId } from "./types";
import {
  isIntegrationActive,
  isIntegrationConfigured,
  isIntegrationEnabled,
  isIntegrationManagedByEnv,
  isIntegrationPending,
  getIntegrationLastFour,
  integrationSummary,
} from "./helpers";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import type { AdminIntegrationsController } from "./use-controller";

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <p className="text-sm text-muted-foreground">
          Click an integration to connect or manage settings.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {group.integrations.map((definition) => {
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
              onClick={() => setActiveDialog(definition.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
