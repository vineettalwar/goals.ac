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
import {
  ArticleIdeasCsvImportSection,
  ArticleIdeasManualSection,
  ArticleIdeasSheetsSection,
  type ArticleIdeaSource,
  type ImportHistory,
  type ImportPreviewRow,
} from "@/components/panels/article-ideas-import-sections";

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

  if (loading) {
    return (
      <div className="paper-card p-6 rounded-xl flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ArticleIdeasCsvImportSection
        fileInputRef={fileInputRef}
        preview={preview}
        pendingFile={pendingFile}
        importing={importing}
        onFileSelect={(file) => void handleFileSelect(file)}
        onConfirmImport={() => void confirmImport()}
      />
      <ArticleIdeasManualSection
        manualKeyword={manualKeyword}
        manualTitle={manualTitle}
        manualAngle={manualAngle}
        onManualKeywordChange={setManualKeyword}
        onManualTitleChange={setManualTitle}
        onManualAngleChange={setManualAngle}
        onManualAdd={() => void handleManualAdd()}
      />
      <ArticleIdeasSheetsSection
        sheetLabel={sheetLabel}
        sheetUrl={sheetUrl}
        sheetName={sheetName}
        creatingSource={creatingSource}
        sources={sources}
        history={history}
        onSheetLabelChange={setSheetLabel}
        onSheetUrlChange={setSheetUrl}
        onSheetNameChange={setSheetName}
        onCreateSheetSource={() => void handleCreateSheetSource()}
        onSyncSource={(id) => void handleSyncSource(id)}
        onDeleteSource={(id) => void handleDeleteSource(id)}
      />
    </div>
  );
}