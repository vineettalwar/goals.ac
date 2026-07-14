import { m, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  FileText,
  Zap,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import type { CompetitorAnalysisResponse } from "@workspace/api-client-react";

const threatColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
};

export function CompetitorAnalysisResults({ result }: { result: CompetitorAnalysisResponse }) {
  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="mt-8 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{result.competitorName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
          </div>
          <Badge className={`capitalize ml-4 shrink-0 ${threatColors[result.threatLevel]}`}>
            <ShieldAlert className="w-3 h-3 mr-1" />
            {result.threatLevel} threat
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" /> Their Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" /> Their Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" /> Content Gaps to Exploit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.contentGaps.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Zap className="w-4 h-4" /> GEO Visibility Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.geoGaps.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Lightbulb className="w-4 h-4" /> 90-Day Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {result.quickWins.map((w, i) => (
                <li key={w} className="flex items-start gap-2.5 text-sm">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{w}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </m.div>
    </AnimatePresence>
  );
}
