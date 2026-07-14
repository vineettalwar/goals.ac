"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { handleAiBillingError } from "@/lib/billing/quota-checkout";
import { isAiBillingDeniedPayload } from "@/components/billing/quota-upgrade-prompt";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function GenerateArticleButton({ companyId }: { companyId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/autopilot-articles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (res.status === 402 && isAiBillingDeniedPayload(body)) {
        handleAiBillingError(body);
        return;
      }
      toast.error(body.message ?? "Article generation failed. Try again.");
      return;
    }

    const { article, generation } = await res.json();
    const source = generation?.source === "user-key" ? "your API key" : "platform key";
    const cost = typeof generation?.estimatedCostUsd === "number" ? ` · ~$${generation.estimatedCostUsd.toFixed(4)}` : "";
    toast.success(`Article generated with ${source}${cost}`);
    router.push(`/autopilot/articles/${article.id}`);
    router.refresh();
  }

  return (
    <Button onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <><Spinner size="sm" className="border-white/30 border-t-white" /> Generating...</>
      ) : (
        <><Plus className="h-4 w-4" /> Generate article</>
      )}
    </Button>
  );
}
