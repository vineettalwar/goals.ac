"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

type Idea = {
  title: string;
  primaryKeyword: string;
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  difficulty: "low" | "medium" | "high";
  whyItMatters: string;
  refinementPointers: string[];
  angle: string;
};

interface ContentAgentPanelProps {
  companyId: number;
}

export function ContentAgentPanel({ companyId }: ContentAgentPanelProps) {
  const router = useRouter();
  const [contentGoal, setContentGoal] = useState("");
  const [tonePreference, setTonePreference] = useState("Professional, practical");
  const [focusArea, setFocusArea] = useState("");
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingBuildKeyword, setLoadingBuildKeyword] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string>("platform");

  const hasIdeas = ideas.length > 0;
  const helperText = useMemo(() => {
    if (sourceLabel === "user-key") return "Research powered by your API key";
    if (sourceLabel === "replit-proxy") return "Research powered by shared platform key";
    return "Research powered by platform key";
  }, [sourceLabel]);

  async function generateIdeas() {
    setLoadingIdeas(true);
    const res = await fetch("/api/autopilot-articles/topic-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        contentGoal: contentGoal.trim() || undefined,
        tonePreference: tonePreference.trim() || undefined,
        focusArea: focusArea.trim() || undefined,
      }),
    });
    setLoadingIdeas(false);

    if (!res.ok) {
      toast.error("Topic research failed. Please try again.");
      return;
    }

    const data = (await res.json()) as {
      ideas?: Idea[];
      generation?: { source?: string };
    };
    setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    setSourceLabel(data.generation?.source ?? "platform-key");
    toast.success("Topic ideas generated.");
  }

  async function buildIdea(idea: Idea) {
    setLoadingBuildKeyword(idea.primaryKeyword);
    const res = await fetch("/api/autopilot-articles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        keyword: idea.primaryKeyword,
        angle: idea.angle,
        contentGoal: contentGoal.trim() || undefined,
        tonePreference: tonePreference.trim() || undefined,
      }),
    });
    setLoadingBuildKeyword(null);

    if (!res.ok) {
      toast.error("Could not build article from this topic.");
      return;
    }

    const data = (await res.json()) as {
      article: { id: number };
      generation?: { source?: string; estimatedCostUsd?: number };
    };
    const source = data.generation?.source === "user-key" ? "your key" : "platform key";
    const cost = typeof data.generation?.estimatedCostUsd === "number" ? ` · ~$${data.generation.estimatedCostUsd.toFixed(4)}` : "";
    toast.success(`Article built using ${source}${cost}`);
    router.push(`/autopilot/articles/${data.article.id}`);
    router.refresh();
  }

  return (
    <div className="paper-card p-5 space-y-4 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Content Agent
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tell the agent your goals, get researched topic ideas, refine them, then click build.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{helperText}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">What do you want to achieve with these articles?</label>
          <Textarea
            value={contentGoal}
            onChange={(e) => setContentGoal(e.target.value)}
            placeholder="Example: Bring qualified leads from founders searching for B2B SaaS content automation strategies."
            className="min-h-[92px]"
          />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tone preference</label>
            <Input
              value={tonePreference}
              onChange={(e) => setTonePreference(e.target.value)}
              placeholder="Professional, conversational..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Optional focus area</label>
            <Input
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="WordPress SEO automation"
            />
          </div>
          <Button onClick={generateIdeas} disabled={loadingIdeas} className="w-full">
            {loadingIdeas ? (
              <>
                <Spinner size="sm" className="border-white/30 border-t-white" /> Researching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate topic ideas
              </>
            )}
          </Button>
        </div>
      </div>

      {hasIdeas && (
        <div className="space-y-3 pt-1">
          <div className="text-xs text-muted-foreground">Suggested topics ({ideas.length})</div>
          <div className="grid grid-cols-1 gap-3">
            {ideas.map((idea) => (
              <div key={`${idea.primaryKeyword}-${idea.title}`} className="rounded-xl border border-border p-4 bg-card/50">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-medium text-sm">{idea.title}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {idea.searchIntent}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {idea.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong className="text-foreground">Keyword:</strong> {idea.primaryKeyword}
                </p>
                <p className="text-sm mb-2">{idea.whyItMatters}</p>
                <p className="text-xs text-muted-foreground mb-1">
                  <strong className="text-foreground">Refinement angle:</strong> {idea.angle}
                </p>
                {idea.refinementPointers?.length > 0 && (
                  <ul className="list-disc ml-5 text-xs text-muted-foreground space-y-1 mb-3">
                    {idea.refinementPointers.slice(0, 3).map((pointer) => (
                      <li key={pointer}>{pointer}</li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  onClick={() => buildIdea(idea)}
                  disabled={loadingBuildKeyword === idea.primaryKeyword}
                >
                  {loadingBuildKeyword === idea.primaryKeyword ? (
                    <>
                      <Spinner size="sm" className="border-white/30 border-t-white" /> Building...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Build article
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
