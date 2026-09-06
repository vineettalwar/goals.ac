import { BarChart3, Lightbulb, Loader2, Search } from "lucide-react";
import { btnPrimary, inputClass, StatusPill } from "./shared";
import type { KeywordAnalysisResult } from "./keyword-tracking-types";

const DIFFICULTY_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export function KeywordAnalyzerTab({
  keywordInput,
  websiteUrl,
  onKeywordInputChange,
  onWebsiteUrlChange,
  onAnalyze,
  analyzing,
  analysis,
}: {
  keywordInput: string;
  websiteUrl: string;
  onKeywordInputChange: (value: string) => void;
  onWebsiteUrlChange: (value: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  analysis: KeywordAnalysisResult | null;
}) {
  return (
    <div className="space-y-6">
      <div className="paper-card space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Search className="h-4 w-4" /> Keyword analysis
        </h2>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Keywords (comma-separated)</span>
          <input
            type="text"
            placeholder="B2B lead generation, SaaS marketing"
            value={keywordInput}
            onChange={(event) => onKeywordInputChange(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Website URL (optional)</span>
          <input
            type="text"
            placeholder="https://yoursite.com"
            value={websiteUrl}
            onChange={(event) => onWebsiteUrlChange(event.target.value)}
            className={inputClass}
          />
        </label>
        {onAnalyze ? (
          <button
            type="button"
            disabled={analyzing}
            onClick={onAnalyze}
            className={btnPrimary}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Analyzing…
              </>
            ) : (
              "Analyze keywords"
            )}
          </button>
        ) : null}
      </div>

      {analysis ? (
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-5">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" /> Top opportunity
            </h2>
            <p className="text-sm text-muted-foreground">{analysis.topOpportunity}</p>
            <p className="mt-2 text-sm">{analysis.summary}</p>
          </div>
          {analysis.keywords.map((kw, index) => (
            <div key={index} className="paper-card space-y-3 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{kw.keyword}</h3>
                <StatusPill
                  label={kw.difficulty}
                  tone={DIFFICULTY_TONE[kw.difficulty] ?? "muted"}
                />
              </div>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${kw.aiVisibility}%` }}
                  />
                </div>
                <span className="text-xs font-medium">AI: {kw.aiVisibility}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
