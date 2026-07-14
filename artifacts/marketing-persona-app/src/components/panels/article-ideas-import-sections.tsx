"use client";

import { useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Plus,
  Download,
  RefreshCw,
  Link2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export type ImportPreviewRow = {
  rowNumber: number;
  keyword: string;
  suggestedTitle: string;
  suggestedAngle: string;
  errors: string[];
};

export type ArticleIdeaSource = {
  id: number;
  label: string;
  spreadsheetId: string;
  sheetName: string | null;
  connected: boolean;
  syncStatus: string;
  rowCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
};

export type ImportHistory = {
  id: number;
  sourceType: string;
  fileName: string | null;
  rowCount: number;
  errorCount: number;
  createdAt: string;
};

const CSV_TEMPLATE = "keyword,title,angle,volume,intent\nb2b lead generation,Complete Guide to B2B Lead Generation,Focus on SaaS founders,1200/mo,informational";

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "article-ideas-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ArticleIdeasCsvImportSection({
  fileInputRef,
  preview,
  pendingFile,
  importing,
  onFileSelect,
  onConfirmImport,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  preview: ImportPreviewRow[] | null;
  pendingFile: File | null;
  importing: boolean;
  onFileSelect: (file: File) => void;
  onConfirmImport: () => void;
}) {
  return (
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a spreadsheet with columns: keyword, title, angle (optional), volume, intent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose CSV
          </Button>
          {preview && pendingFile && (
            <Button size="sm" onClick={onConfirmImport} disabled={importing}>
              {importing ? <Spinner size="sm" /> : `Import ${pendingFile.name}`}
            </Button>
          )}
        </div>
        {preview && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Row</th>
                  <th className="text-left p-2">Keyword</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-border">
                    <td className="p-2">{row.rowNumber}</td>
                    <td className="p-2">{row.keyword || "—"}</td>
                    <td className="p-2">{row.suggestedTitle || "—"}</td>
                    <td className="p-2 text-xs">
                      {row.errors.length > 0 ? (
                        <span className="text-destructive">{row.errors.join(", ")}</span>
                      ) : (
                        <span className="text-green-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}

export function ArticleIdeasManualSection({
  manualKeyword,
  manualTitle,
  manualAngle,
  onManualKeywordChange,
  onManualTitleChange,
  onManualAngleChange,
  onManualAdd,
}: {
  manualKeyword: string;
  manualTitle: string;
  manualAngle: string;
  onManualKeywordChange: (v: string) => void;
  onManualTitleChange: (v: string) => void;
  onManualAngleChange: (v: string) => void;
  onManualAdd: () => void;
}) {
  return (
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add manually
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Keyword</Label>
            <Input value={manualKeyword} onChange={(e) => onManualKeywordChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Article title</Label>
            <Input value={manualTitle} onChange={(e) => onManualTitleChange(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Angle (optional)</Label>
          <Input value={manualAngle} onChange={(e) => onManualAngleChange(e.target.value)} />
        </div>
        <Button onClick={onManualAdd}>Add idea</Button>
      </div>
  );
}

export function ArticleIdeasSheetsSection({
  projectId,
  sheetLabel,
  sheetUrl,
  sheetName,
  creatingSource,
  sources,
  history,
  onSheetLabelChange,
  onSheetUrlChange,
  onSheetNameChange,
  onCreateSheetSource,
  onSyncSource,
  onDeleteSource,
}: {
  projectId: string;
  sheetLabel: string;
  sheetUrl: string;
  sheetName: string;
  creatingSource: boolean;
  sources: ArticleIdeaSource[];
  history: ImportHistory[];
  onSheetLabelChange: (v: string) => void;
  onSheetUrlChange: (v: string) => void;
  onSheetNameChange: (v: string) => void;
  onCreateSheetSource: () => void;
  onSyncSource: (id: number) => void;
  onDeleteSource: (id: number) => void;
}) {
  return (
    <>
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Google Sheets
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect a sheet with the same columns as the CSV template. Export to CSV anytime as a
          fallback.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              placeholder="Q3 content backlog"
              value={sheetLabel}
              onChange={(e) => onSheetLabelChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sheet URL</Label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => onSheetUrlChange(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label>Tab name (optional)</Label>
          <Input value={sheetName} onChange={(e) => onSheetNameChange(e.target.value)} />
        </div>
        <Button onClick={onCreateSheetSource} disabled={creatingSource}>
          {creatingSource ? <Spinner size="sm" /> : "Connect Google Sheets"}
        </Button>

        {sources.length > 0 && (
          <div className="space-y-2 pt-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border"
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
                  {source.syncError && (
                    <p className="text-xs text-destructive mt-1">{source.syncError}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => onSyncSource(source.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {!source.connected && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/auth/google-sheets?projectId=${projectId}&sourceId=${source.id}`} aria-label="Connect Google Sheets">
                        <Link2 className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDeleteSource(source.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="paper-card p-6 rounded-xl space-y-3">
          <h2 className="font-semibold text-sm">Import history</h2>
          {history.map((item) => (
            <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
              <span>
                {item.sourceType}
                {item.fileName ? ` · ${item.fileName}` : ""}
              </span>
              <span>
                {item.rowCount} rows · {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
