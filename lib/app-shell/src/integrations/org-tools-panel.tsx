import { useState } from "react";
import { SettingsSemrushDialog, semrushDatabaseLabel } from "../settings/settings-semrush-dialog";
import { SettingsStockByokPanel } from "../settings/settings-stock-byok-panel";
import {
  SettingsProviderKeyDialog,
  type ProviderKeyDialogConfig,
} from "../settings/settings-provider-key-dialog";
import type { SettingsIntegrationsSummary } from "../settings/types";
import { OrgToolIcon } from "./integration-icons";
import { IntegrationTile } from "./integration-tiles";

const DEEPL_KEY_DIALOG: ProviderKeyDialogConfig = {
  providerLabel: "DeepL",
  inputId: "deepl-api-key",
  dialogTitleId: "deepl-key-dialog-title",
  placeholder: "DeepL Pro API key",
  helpText: "Get a key at",
  helpUrl: "https://www.deepl.com/pro-api",
  helpLinkLabel: "deepl.com/pro-api",
  removeConfirmMessage: "Remove the organization DeepL API key?",
  permissionMessage: "Only organization owners and site admins can manage the DeepL API key.",
};

export type OrgToolsPanelProps = {
  integrationsSummary?: SettingsIntegrationsSummary | null;
  canManage?: boolean;
  onSaveSemrushCredentials?: (input: { apiKey: string; database: string }) => Promise<void>;
  onDeleteSemrushCredentials?: () => Promise<void>;
  onTestSemrushCredentials?: (input: {
    apiKey: string;
    database: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  semrushSaving?: boolean;
  semrushDeleting?: boolean;
  onSaveDeeplKey?: (key: string) => Promise<void>;
  onDeleteDeeplKey?: () => Promise<void>;
  onTestDeeplKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  deeplSaving?: boolean;
  deeplDeleting?: boolean;
  onSaveStockCredentials?: (input: { provider: string; apiKey: string }) => Promise<void>;
  onDeleteStockCredentials?: (provider: string) => Promise<void>;
  onTestStockCredentials?: (input: {
    provider: string;
    apiKey: string;
  }) => Promise<{ ok: boolean; error?: string; note?: string }>;
  stockSavingProvider?: string | null;
  stockRemovingProvider?: string | null;
  message?: string | null;
};

export function OrgToolsPanel({
  integrationsSummary,
  canManage = false,
  onSaveSemrushCredentials,
  onDeleteSemrushCredentials,
  onTestSemrushCredentials,
  semrushSaving = false,
  semrushDeleting = false,
  onSaveDeeplKey,
  onDeleteDeeplKey,
  onTestDeeplKey,
  deeplSaving = false,
  deeplDeleting = false,
  onSaveStockCredentials,
  onDeleteStockCredentials,
  onTestStockCredentials,
  stockSavingProvider = null,
  stockRemovingProvider = null,
  message,
}: OrgToolsPanelProps) {
  const [semrushDialogOpen, setSemrushDialogOpen] = useState(false);
  const [deeplDialogOpen, setDeeplDialogOpen] = useState(false);

  const semrushConnected = Boolean(integrationsSummary?.semrush.hasCredentials);
  const deeplConnected = Boolean(integrationsSummary?.deepl.configured);
  const stockCount = integrationsSummary?.stock.org?.length ?? 0;
  const stockConnected = stockCount > 0 || Boolean(integrationsSummary?.stock.platform?.configured);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <p className="text-sm text-muted-foreground">
          Click a tool to connect or manage its organization key.
          {!canManage ? " Only site admins can change these settings." : null}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <IntegrationTile
          compact
          icon={<OrgToolIcon tool="semrush" />}
          title="Semrush"
          description="Keyword gaps, volume, difficulty"
          connected={semrushConnected}
          summary={
            semrushConnected
              ? `••••${integrationsSummary?.semrush.apiKeyLastFour ?? "••••"}${
                  integrationsSummary?.semrush.database
                    ? ` · ${semrushDatabaseLabel(integrationsSummary.semrush.database)}`
                    : ""
                }`
              : "Add organization key"
          }
          onClick={() => {
            if (onSaveSemrushCredentials) setSemrushDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<OrgToolIcon tool="deepl" />}
          title="DeepL"
          description="Translation refinement"
          connected={deeplConnected}
          summary={
            deeplConnected
              ? `••••${integrationsSummary?.deepl.apiKeyLastFour ?? "••••"}`
              : "Add organization key"
          }
          onClick={() => {
            if (onSaveDeeplKey) setDeeplDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<OrgToolIcon tool="unsplash" />}
          title="Stock photos"
          description="Unsplash & Pexels BYOK"
          connected={stockConnected}
          summary={
            stockCount > 0
              ? `${stockCount} org key${stockCount === 1 ? "" : "s"}`
              : integrationsSummary?.stock.platform?.configured
                ? "Using platform keys"
                : "Optional org keys"
          }
          onClick={() => {
            document.getElementById("org-stock-photos")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      {onSaveSemrushCredentials && onTestSemrushCredentials && onDeleteSemrushCredentials ? (
        <SettingsSemrushDialog
          open={semrushDialogOpen}
          onOpenChange={setSemrushDialogOpen}
          hasCredentials={semrushConnected}
          apiKeyLastFour={integrationsSummary?.semrush.apiKeyLastFour ?? null}
          database={integrationsSummary?.semrush.database ?? "us"}
          onSave={onSaveSemrushCredentials}
          onDelete={onDeleteSemrushCredentials}
          onTest={onTestSemrushCredentials}
          canManage={canManage}
          saving={semrushSaving}
          deleting={semrushDeleting}
        />
      ) : null}

      {onSaveDeeplKey && onTestDeeplKey && onDeleteDeeplKey ? (
        <SettingsProviderKeyDialog
          open={deeplDialogOpen}
          onOpenChange={setDeeplDialogOpen}
          hasKey={deeplConnected}
          lastFour={integrationsSummary?.deepl.apiKeyLastFour ?? null}
          onSave={onSaveDeeplKey}
          onDelete={onDeleteDeeplKey}
          onTest={onTestDeeplKey}
          canManage={canManage}
          saving={deeplSaving}
          deleting={deeplDeleting}
          config={DEEPL_KEY_DIALOG}
        />
      ) : null}

      <div id="org-stock-photos" className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Stock photos (Unsplash / Pexels)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional API keys for copyright-free stock search. Platform keys are used when unset.
          </p>
        </div>
        {onSaveStockCredentials && onTestStockCredentials && onDeleteStockCredentials ? (
          <SettingsStockByokPanel
            platform={integrationsSummary?.stock.platform}
            orgCredentials={integrationsSummary?.stock.org ?? []}
            providers={integrationsSummary?.stock.providers ?? []}
            canManage={canManage}
            onSave={onSaveStockCredentials}
            onDelete={onDeleteStockCredentials}
            onTest={onTestStockCredentials}
            savingProvider={stockSavingProvider}
            removingProvider={stockRemovingProvider}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Stock credential settings unavailable.</p>
        )}
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
