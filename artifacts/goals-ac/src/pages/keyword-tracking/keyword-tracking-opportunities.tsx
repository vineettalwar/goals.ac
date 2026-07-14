import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListPlus, Target } from "lucide-react";
import { m } from "framer-motion";

export interface KeywordOpportunity {
  id: number;
  keyword: string;
  source: string;
  opportunityScore: number;
  difficulty: string | null;
  estimatedVolume: string | null;
  suggestedTitle: string;
  suggestedAngle: string;
  status: string;
  contentItemId: number | null;
}

const difficultyColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
};

export function KeywordTrackingOpportunities({
  opportunities,
  queueingId,
  onQueue,
  onDismiss,
}: {
  opportunities: KeywordOpportunity[];
  queueingId: number | null;
  onQueue: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  if (opportunities.length === 0) return null;
  return (
    <m.div {...{ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45 } }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Keyword opportunities</h2>
        <Badge variant="secondary">{opportunities.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((opp) => (
          <Card key={opp.id} className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{opp.keyword}</CardTitle>
                <Badge className={difficultyColors[opp.difficulty ?? "medium"] ?? difficultyColors.medium}>
                  {opp.difficulty ?? "medium"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Score {opp.opportunityScore} · {opp.source}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{opp.suggestedTitle}</p>
              <p className="text-xs text-muted-foreground">{opp.suggestedAngle}</p>
              <div className="flex gap-2">
                <Button size="sm" disabled={queueingId === opp.id} onClick={() => onQueue(opp.id)}>
                  {queueingId === opp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5 mr-1" />}
                  Queue
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(opp.id)}>Dismiss</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </m.div>
  );
}
