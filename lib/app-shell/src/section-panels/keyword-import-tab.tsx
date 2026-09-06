import { FileSpreadsheet, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { btnOutline, btnPrimary, inputClass, PanelLoading } from "./shared";
import type { ArticleIdeaImportHistory, ArticleIdeaSourceRow } from "./keyword-tracking-types";

export function KeywordImportTab({
  canImport = true,
  sheetsStatusMessage,
  manualKeyword,
  manualTitle,
  manualAngle,
  onManualKeywordChange,
  onManualTitleChange,
  onManualAngleChange,
  onManualImport,
  manualImporting,
  onCsvImport,
  csvImporting,
  sheetSources = [],
  sheetSourcesLoading,
  sheetLabel,
  sheetUrl,
  sheetName,
  onSheetLabelChange,
  onSheetUrlChange,
  onSheetNameChange,
  onCreateSheetSource,
  creatingSheetSource,
  onSyncSheetSource,
  onDeleteSheetSource,
  onConnectSheetSource,
  syncingSheetId,
  importHistory,
  importLoading,
}: {
  canImport?: boolean;
  sheetsStatusMessage?: string | null;
  manualKeyword: string;
  manualTitle: string;
  manualAngle: string;
  onManualKeywordChange: (value: string) => void;
  onManualTitleChange: (value: string) => void;
  onManualAngleChange: (value: string) => void;
  onManualImport?: () => void;
  manualImporting?: boolean;
  onCsvImport?: (file: File) => void;
  csvImporting?: boolean;
  sheetSources?: ArticleIdeaSourceRow[];
  sheetSourcesLoading?: boolean;
  sheetLabel?: string;
  sheetUrl?: string;
  sheetName?: string;
  onSheetLabelChange?: (value: string) => void;
  onSheetUrlChange?: (value: string) => void;
  onSheetNameChange?: (value: string) => void;
  onCreateSheetSource?: () => void;
  creatingSheetSource?: boolean;
  onSyncSheetSource?: (id: number) => void;
  onDeleteSheetSource?: (id: number) => void;
  onConnectSheetSource?: (id: number) => void;
  syncingSheetId?: number | null;
  importHistory: ArticleIdeaImportHistory[];
  importLoading?: boolean;
}) {
  if (!canImport) {
    return (
      <div className="paper-card rounded-xl p-6 text-sm text-muted-foreground">
        Article idea imports are available to site admins. Ask your org admin to upload a CSV,
        connect Google Sheets, or add ideas manually.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sheetsStatusMessage ? (
        <p className="text-sm text-muted-foreground">{sheetsStatusMessage}</p>
      ) : null}

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h2 className="font-semibold">Manual import</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Keyword</span>
            <input
              type="text"
              value={manualKeyword}
              onChange={(event) => onManualKeywordChange(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Suggested title</span>
            <input
              type="text"
              value={manualTitle}
              onChange={(event) => onManualTitleChange(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Angle (optional)</span>
          <input
            type="text"
            value={manualAngle}
            onChange={(event) => onManualAngleChange(event.target.value)}
            className={inputClass}
          />
        </label>
        {onManualImport ? (
          <button
            type="button"
            disabled={manualImporting || !manualKeyword.trim() || !manualTitle.trim()}
            className={btnPrimary}
            onClick={onManualImport}
          >
            {manualImporting ? "Importing…" : "Add idea"}
          </button>
        ) : null}
      </div>

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h2 className="font-semibold">CSV import</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV with keyword, title, and optional angle columns.
        </p>
        {onCsvImport ? (
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={csvImporting}
            className="text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onCsvImport(file);
              event.target.value = "";
            }}
          />
        ) : null}
        {csvImporting ? <p className="text-xs text-muted-foreground">Importing CSV…</p> : null}
      </div>

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <FileSpreadsheet className="h-4 w-4" /> Google Sheets
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect a sheet with keyword, title, and optional angle columns — same as the CSV
          template.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Label</span>
            <input
              type="text"
              placeholder="Q3 content backlog"
              value={sheetLabel ?? ""}
              onChange={(event) => onSheetLabelChange?.(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Sheet URL</span>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl ?? ""}
              onChange={(event) => onSheetUrlChange?.(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="text-muted-foreground">Tab name (optional)</span>
          <input
            type="text"
            value={sheetName ?? ""}
            onChange={(event) => onSheetNameChange?.(event.target.value)}
            className={inputClass}
          />
        </label>
        {onCreateSheetSource ? (
          <button
            type="button"
            disabled={creatingSheetSource || !sheetLabel?.trim() || !sheetUrl?.trim()}
            className={btnPrimary}
            onClick={onCreateSheetSource}
          >
            {creatingSheetSource ? "Connecting…" : "Connect Google Sheets"}
          </button>
        ) : null}

        {sheetSourcesLoading ? (
          <PanelLoading label="Loading sheet sources…" />
        ) : sheetSources.length > 0 ? (
          <div className="space-y-2 pt-2">
            {sheetSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{source.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.connected ? "Google connected" : "Needs Google auth"} ·{" "}
                    {source.syncStatus}
                    {source.lastSyncedAt
                      ? ` · ${new Date(source.lastSyncedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                  {source.syncError ? (
                    <p className="mt-1 text-xs text-red-700">{source.syncError}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  {onSyncSheetSource ? (
                    <button
                      type="button"
                      className={btnOutline}
                      disabled={syncingSheetId === source.id}
                      onClick={() => onSyncSheetSource(source.id)}
                    >
                      {syncingSheetId === source.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                  {!source.connected && onConnectSheetSource ? (
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() => onConnectSheetSource(source.id)}
                      aria-label="Connect Google Sheets"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  {onDeleteSheetSource ? (
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                      onClick={() => onDeleteSheetSource(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="paper-card rounded-xl p-6">
        <h2 className="mb-3 font-semibold">Import history</h2>
        {importLoading ? (
          <PanelLoading label="Loading history…" />
        ) : importHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {importHistory.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2">
                <span className="capitalize">{row.source.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {row.rowCount} rows · {new Date(row.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
