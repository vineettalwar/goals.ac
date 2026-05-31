"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

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

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function groupByWeek(items: ContentItem[]): Record<number, ContentItem[]> {
  return items.reduce<Record<number, ContentItem[]>>((acc, item) => {
    const week = Math.ceil(item.day / 7);
    acc[week] = [...(acc[week] ?? []), item];
    return acc;
  }, {});
}

export default function ContentStrategyPage() {
  const params = useParams<{ id: string }>();
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/content-strategies/${params.id}`)
      .then((r) => r.json())
      .then((data) => setStrategy(data.strategy ?? data))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>;
  if (!strategy) return <div className="p-8 text-muted-foreground">Content strategy not found.</div>;

  const byWeek = groupByWeek(strategy.items ?? []);

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        {strategy.websiteProjectId && (
          <Link href={`/projects/${strategy.websiteProjectId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {MONTH_NAMES[(strategy.month ?? 1) - 1]} {strategy.year} Content Strategy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {strategy.industry} · {strategy.location} · {strategy.stage} stage · {(strategy.items ?? []).length} pieces
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(byWeek).sort(([a], [b]) => Number(a) - Number(b)).map(([week, weekItems]) => (
          <div key={week} className="paper-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Week {week} <span className="text-muted-foreground font-normal text-sm">(Days {(Number(week) - 1) * 7 + 1}–{Math.min(Number(week) * 7, 30)})</span>
            </h3>
            {weekItems.sort((a, b) => a.day - b.day).map((item) => (
              <div key={item.id} className="border border-[--border] rounded-lg p-4 space-y-2">
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
                  <p className="text-xs text-muted-foreground ml-6">Keyword: <span className="font-medium text-foreground">{item.primaryKeyword}</span></p>
                )}
                {item.topicAngle && (
                  <p className="text-xs text-muted-foreground ml-6">{item.topicAngle}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
