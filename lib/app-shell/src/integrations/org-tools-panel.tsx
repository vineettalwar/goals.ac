import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SettingsSemrushDialog, semrushDatabaseLabel } from "../settings/settings-semrush-dialog";
import { SettingsStockByokPanel } from "../settings/settings-stock-byok-panel";
import {
  SettingsProviderKeyDialog,
  type ProviderKeyDialogConfig,
} from "../settings/settings-provider-key-dialog";
import type { SettingsIntegrationsSummary } from "../settings/types";

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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Organization tools for keyword research, translation, and stock photos. Shared across all
        projects.
      </p>

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Semrush (BYOK)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Semrush API key for keyword gaps, search volume, and difficulty in content
              suggestions.
            </p>
          </div>
          {onSaveSemrushCredentials ? (
            <button
              type="button"
              onClick={() => setSemrushDialogOpen(true)}
              disabled={!canManage}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {integrationsSummary?.semrush.hasCredentials ? "Replace key" : "Add key"}
            </button>
          ) : null}
        </div>
        {integrationsSummary?.semrush.hasCredentials ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization Semrush API key connected</p>
              <p className="text-xs text-muted-foreground">
                Key ending in ••••{integrationsSummary.semrush.apiKeyLastFour ?? "••••"}
                {integrationsSummary.semrush.database
                  ? ` · database: ${semrushDatabaseLabel(integrationsSummary.semrush.database)}`
                  : ""}
              </p>
            </div>
            {onDeleteSemrushCredentials && canManage ? (
              <button
                type="button"
                onClick={() => void onDeleteSemrushCredentials()}
                disabled={semrushDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {semrushDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization Semrush credentials configured.</p>
        )}
        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage Semrush credentials.
          </p>
        ) : null}
      </div>

      {onSaveSemrushCredentials && onTestSemrushCredentials && onDeleteSemrushCredentials ? (
        <SettingsSemrushDialog
          open={semrushDialogOpen}
          onOpenChange={setSemrushDialogOpen}
          hasCredentials={Boolean(integrationsSummary?.semrush.hasCredentials)}
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

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">DeepL translation (BYOK)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional DeepL API key to refine non-English drafts after humanization.
            </p>
          </div>
          {onSaveDeeplKey ? (
            <button
              type="button"
              onClick={() => setDeeplDialogOpen(true)}
              disabled={!canManage}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {integrationsSummary?.deepl.configured ? "Replace key" : "Add key"}
            </button>
          ) : null}
        </div>
        {integrationsSummary?.deepl.configured ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization DeepL API key connected</p>
              <p className="text-xs text-muted-foreground">
                Key ending in ••••{integrationsSummary.deepl.apiKeyLastFour ?? "••••"}
              </p>
            </div>
            {onDeleteDeeplKey && canManage ? (
              <button
                type="button"
                onClick={() => void onDeleteDeeplKey()}
                disabled={deeplDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {deeplDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization DeepL API key configured.</p>
        )}
        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage the DeepL API key.
          </p>
        ) : null}
      </div>

      {onSaveDeeplKey && onTestDeeplKey && onDeleteDeeplKey ? (
        <SettingsProviderKeyDialog
          open={deeplDialogOpen}
          onOpenChange={setDeeplDialogOpen}
          hasKey={Boolean(integrationsSummary?.deepl.configured)}
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

      <div className="paper-card space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Stock photos (Unsplash / Pexels)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="paper-card p-4 text-sm text-muted-foreground">{message}</div>
      ) : null}
    </div>
  );
}
