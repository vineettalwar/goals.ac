"use client";

import { useEffect, useState } from "react";
import { FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

interface ContentItem {
  id: number;
  day: number;
  title: string;
  format: string;
  topicAngle: string;
  primaryKeyword: string;
  status: string;
}

interface ContentStrategy {
  id: number;
  month: number;
  year: number;
  industry: string;
  location: string;
  stage: string;
  websiteProjectId: number | null;
  items: ContentItem[];
  createdAt: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function groupByWeek(items: ContentItem[]): Record<number, ContentItem[]> {
  return items.reduce<Record<number, ContentItem[]>>((acc, item) => {
    const week = Math.ceil(item.day / 7);
    acc[week] = [...(acc[week] ?? []), item];
    return acc;
  }, {});
}

export function ContentStrategyClient({ id }: { id: string }) {
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/content-strategies/${id}`)
      .then((r) => r.json())
      .then((data) => setStrategy(data.strategy ?? data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <MarketingPageShell
        hero={
          <PageHero
            badge="Content Strategy"
            titleLine1="Loading"
            titleLine2="your plan…"
            backgroundImage={HERO_IMAGES.contentStrategy.hero}
          />
        }
      >
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          Loading strategy…
        </div>
      </MarketingPageShell>
    );
  }

  if (!strategy) {
    return (
      <MarketingPageShell
        hero={
          <PageHero
            badge="Content Strategy"
            titleLine1="Strategy"
            titleLine2="not found"
            backgroundImage={HERO_IMAGES.contentStrategy.hero}
            ctas={[{ label: "Go home", href: "/", variant: "primary" }]}
          />
        }
      />
    );
  }

  const byWeek = groupByWeek(strategy.items ?? []);
  const monthLabel = MONTH_NAMES[(strategy.month ?? 1) - 1];

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={`${strategy.industry} · ${strategy.location}`}
          titleLine1={`${monthLabel} ${strategy.year}`}
          titleLine2="Content Strategy"
          description={`${strategy.stage} stage · ${(strategy.items ?? []).length} planned pieces`}
          backgroundImage={HERO_IMAGES.contentStrategy.hero}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "Content engine", href: "/content-engine", variant: "ghost" },
          ]}
        />
      }
    >
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {Object.entries(byWeek)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([week, weekItems]) => (
            <div key={week} className="paper-card paper-card-hover rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Week {week}{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  (Days {(Number(week) - 1) * 7 + 1}–{Math.min(Number(week) * 7, 30)})
                </span>
              </h3>
              {weekItems
                .sort((a, b) => a.day - b.day)
                .map((item) => (
                  <div key={item.id} className="border border-(--border) rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Day {item.day}</span>
                        <Badge variant="muted">{item.format?.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    {item.primaryKeyword && (
                      <p className="text-xs text-muted-foreground ml-6">
                        Keyword:{" "}
                        <span className="font-medium text-foreground">{item.primaryKeyword}</span>
                      </p>
                    )}
                    {item.topicAngle && (
                      <p className="text-xs text-muted-foreground ml-6">{item.topicAngle}</p>
                    )}
                  </div>
                ))}
            </div>
          ))}
      </div>

      <MarketingCTA
        titleLine1="Turn this plan into"
        titleLine2="published content"
        description="Connect your CMS and generate drafts from each item in your strategy."
        variant="dark"
        backgroundImage={HERO_IMAGES.contentStrategy.footer}
        primaryLabel="Create free account"
      />
    </MarketingPageShell>
  );
}
