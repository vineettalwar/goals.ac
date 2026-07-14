"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAutopilotIntent, AUTOPILOT_REFERRER } from "@/lib/projects/autopilot-intent";

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function AutopilotUrlHero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Enter a valid website URL (include your domain).");
      return;
    }
    setError(null);
    saveAutopilotIntent({ websiteUrl: normalized, referrer: AUTOPILOT_REFERRER });
    router.push(`/signup?from=${AUTOPILOT_REFERRER}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          inputMode="url"
          placeholder="https://yourwebsite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 text-base bg-background/95"
          aria-label="Your website URL"
        />
        <Button type="submit" size="lg" className="h-12 shrink-0 gap-2">
          Get 3 articles + 30-day plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Free to start · No credit card · Expert articles on autopilot
      </p>
    </form>
  );
}
