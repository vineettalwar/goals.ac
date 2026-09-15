import { useCallback, useState } from "react";
import { CheckCircle2, Copy, Download } from "lucide-react";

export type ContentExportPlatform = "medium" | "substack";

const PLATFORM_INSTRUCTIONS: Record<ContentExportPlatform, string> = {
  medium:
    "Copy the markdown below and paste it into Medium's editor. Medium's publish API is deprecated — export is the supported workflow.",
  substack:
    "Copy the markdown below and paste it into Substack's post editor. Substack does not offer a public write API.",
};

export function ContentExportPanel({
  platform,
  title,
  bodyMarkdown,
}: {
  platform: ContentExportPlatform;
  title?: string | null;
  bodyMarkdown?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const hasBody = Boolean(bodyMarkdown?.trim());
  const content = hasBody
    ? `# ${title?.trim() || "Untitled"}\n\n${bodyMarkdown}`
    : "Generate or open a content piece to export.";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title?.trim() || "content").replace(/\s+/g, "-").toLowerCase()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [content, title]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium capitalize">{platform} export</p>
        <p className="mt-1 text-xs text-muted-foreground">{PLATFORM_INSTRUCTIONS[platform]}</p>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
        {content.slice(0, 2000)}
        {content.length > 2000 ? "\n…" : ""}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!hasBody}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy markdown"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasBody}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download .md
        </button>
      </div>
    </div>
  );
}
