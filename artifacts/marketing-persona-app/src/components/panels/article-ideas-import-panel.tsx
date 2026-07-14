"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
import { isSiteAdmin } from "@/lib/org/org-access-shared";

type ImportPreviewRow = {
  rowNumber: number;
  keyword: string;
  suggestedTitle: string;
  suggestedAngle: string;
  errors: string[];
};

type ArticleIdeaSource = {
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

type ImportHistory = {
  id: number;
  sourceType: string;
  fileName: string | null;
  rowCount: number;
  errorCount: number;
  createdAt: string;
};

const CSV_TEMPLATE = "keyword,title,angle,volume,intent\nb2b lead generation,Complete Guide to B2B Lead Generation,Focus on SaaS founders,1200/mo,informational";

export function ArticleIdeasImportPanel({
  projectId,
  onImported,
}: {
  projectId: string;
  onImported?: () => void;
}) {
  const { data: session } = useSession();
  const canImport =
    session?.user?.role === "super_admin" ||
    session?.user?.role === "admin" ||
    isSiteAdmin(session?.user?.orgRole);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [sources, setSources] = useState<ArticleIdeaSource[]>([]);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const [manualKeyword, setManualKeyword] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAngle, setManualAngle] = useState("");

  const [sheetLabel, setSheetLabel] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [creatingSource, setCreatingSource] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sourcesRes, historyRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/article-idea-sources`),
      fetch(`/api/website-projects/${projectId}/article-ideas`),
    ]);
    setLoading(false);
    if (sourcesRes.ok) {
      const data = await sourcesRes.json();
      setSources(data.sources ?? []);
    }
    if (historyRes.ok) {
      const data = await historyRes.json();
      setHistory(
        (data.imports ?? []).map((row: ImportHistory) => ({
          ...row,
          createdAt: String(row.createdAt),
        })),
      );
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && canImport) void load();
  }, [projectId, canImport, load]);

  if (!canImport) {
    return (
      <div className="paper-card p-6 rounded-xl text-sm text-muted-foreground">
        Article idea imports are available to site admins. Ask your org admin to upload a CSV,
        connect Google Sheets, or add ideas manually.
      </div>
    );
  }

  async function handleFileSelect(file: File) {
    setPendingFile(file);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `/api/website-projects/${projectId}/article-ideas/import?dryRun=true`,
      { method: "POST", body: formData },
    );
    if (!res.ok) {
      toast.error("Failed to parse CSV");
      return;
    }
    const data = await res.json();
    setPreview(data.preview ?? []);
  }

  async function confirmImport() {
    if (!pendingFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", pendingFile);
    const res = await fetch(`/api/website-projects/${projectId}/article-ideas/import`, {
      method: "POST",
      body: formData,
    });
    setImporting(false);
    if (!res.ok) {
      toast.error("Import failed");
      return;
    }
    const data = await res.json();
    toast.success(`Imported ${data.inserted ?? 0} article ideas`);
    setPreview(null);
    setPendingFile(null);
    await load();
    onImported?.();
  }

  async function handleManualAdd() {
    if (!manualKeyword.trim() || !manualTitle.trim()) {
      toast.error("Keyword and title are required");
      return;
    }
    const res = await fetch(`/api/website-projects/${projectId}/article-ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: manualKeyword.trim(),
        suggestedTitle: manualTitle.trim(),
        suggestedAngle: manualAngle.trim(),
      }),
    });
    if (!res.ok) {
      toast.error("Failed to add idea");
      return;
    }
    toast.success("Article idea added");
    setManualKeyword("");
    setManualTitle("");
    setManualAngle("");
    await load();
    onImported?.();
  }

  async function handleCreateSheetSource() {
    if (!sheetLabel.trim() || !sheetUrl.trim()) {
      toast.error("Label and spreadsheet URL are required");
      return;
    }
    setCreatingSource(true);
    const res = await fetch(`/api/website-projects/${projectId}/article-idea-sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: sheetLabel.trim(),
        spreadsheetUrl: sheetUrl.trim(),
        sheetName: sheetName.trim() || undefined,
      }),
    });
    setCreatingSource(false);
    if (!res.ok) {
      toast.error("Failed to create sheet source");
      return;
    }
    const data = await res.json();
    toast.success("Sheet source created — connect Google to sync");
    if (data.connectUrl) {
      window.location.href = data.connectUrl;
    }
    await load();
  }

  async function handleSyncSource(sourceId: number) {
    const res = await fetch(`/api/website-projects/${projectId}/article-idea-sources/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.connectUrl) {
        window.location.href = data.connectUrl;
        return;
      }
      toast.error(data.error ?? "Sync failed");
      return;
    }
    const data = await res.json();
    toast.success(`Synced ${data.inserted ?? 0} ideas from sheet`);
    await load();
    onImported?.();
  }

  async function handleDeleteSource(sourceId: number) {
    const res = await fetch(
      `/api/website-projects/${projectId}/article-idea-sources?sourceId=${sourceId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Failed to remove source");
      return;
    }
    await load();
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "article-ideas-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="paper-card p-6 rounded-xl flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a spreadsheet with columns: keyword, title, angle (optional), volume, intent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
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
              if (file) void handleFileSelect(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose CSV
          </Button>
          {preview && pendingFile && (
            <Button size="sm" onClick={confirmImport} disabled={importing}>
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

      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add manually
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Keyword</Label>
            <Input value={manualKeyword} onChange={(e) => setManualKeyword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Article title</Label>
            <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Angle (optional)</Label>
          <Input value={manualAngle} onChange={(e) => setManualAngle(e.target.value)} />
        </div>
        <Button onClick={handleManualAdd}>Add idea</Button>
      </div>

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
              onChange={(e) => setSheetLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sheet URL</Label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label>Tab name (optional)</Label>
          <Input value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
        </div>
        <Button onClick={handleCreateSheetSource} disabled={creatingSource}>
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
                  <Button size="sm" variant="outline" onClick={() => handleSyncSource(source.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {!source.connected && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/auth/google-sheets?projectId=${projectId}&sourceId=${source.id}`}>
                        <Link2 className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteSource(source.id)}>
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
    </div>
  );
}
