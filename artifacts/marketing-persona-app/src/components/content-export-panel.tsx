"use client";

import { useCallback, useState } from "react";
import { Copy, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentExportPanelProps {
  platform: "medium" | "substack";
  title?: string;
  bodyMarkdown?: string;
}

const PLATFORM_INSTRUCTIONS: Record<ContentExportPanelProps["platform"], string> = {
  medium: "Copy the markdown below and paste it into Medium's editor. Medium's publish API is deprecated — export is the supported workflow.",
  substack: "Copy the markdown below and paste it into Substack's post editor. Substack does not offer a public write API.",
};

export function ContentExportPanel({ platform, title, bodyMarkdown }: ContentExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const content = bodyMarkdown
    ? `# ${title ?? "Untitled"}\n\n${bodyMarkdown}`
    : "Generate or open a content piece to export.";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title ?? "content").replace(/\s+/g, "-").toLowerCase()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [content, title]);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base capitalize">{platform} export</CardTitle>
        <CardDescription>{PLATFORM_INSTRUCTIONS[platform]}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-3">
        <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
          {content.slice(0, 2000)}
          {content.length > 2000 ? "\n…" : ""}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleCopy()} disabled={!bodyMarkdown}>
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            {copied ? "Copied" : "Copy markdown"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!bodyMarkdown}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download .md
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
