import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { useGetContentStrategy, getGetContentStrategyQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";

const FORMAT_COLORS: Record<string, string> = {
  "LinkedIn post": "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  "Blog article": "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  "Twitter thread": "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25",
  "Case study": "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  "Video script": "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  "Newsletter": "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
  "Podcast outline": "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/25",
};

function formatBadgeColor(fmt: string): string {
  return FORMAT_COLORS[fmt] ?? "bg-muted text-muted-foreground border border-border";
}

export default function ContentStrategy() {
  const { id = "" } = useParams<{ id: string }>();
  const strategyId = Number(id);

  const { data: strategy, isLoading, isError } = useGetContentStrategy(strategyId, {
    query: { enabled: !!strategyId && !isNaN(strategyId), queryKey: getGetContentStrategyQueryKey(strategyId) },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-12 max-w-5xl space-y-8">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
            {Array.from({ length: 30 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !strategy) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Strategy Not Found</h1>
          <p className="text-muted-foreground">This content strategy does not exist or has been removed.</p>
        </div>
      </Layout>
    );
  }

  const monthName = format(new Date(strategy.year, strategy.month - 1, 1), "MMMM yyyy");

  return (
    <Layout>
      <SEO
        title={`30-Day Content Strategy — ${strategy.industry} in ${strategy.location} | goals.ac`}
        description={`A 30-day SEO and thought-leadership content plan for a ${strategy.industry} startup at ${strategy.stage} stage based in ${strategy.location}.`}
      />

      {/* Header */}
      <div className="relative bg-mesh-dark text-zinc-50 py-12 md:py-16 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[400px] h-[350px] top-[-20%] left-[30%]" />
        <div className="orb orb-violet w-[250px] h-[250px] bottom-[-10%] right-[10%]" />

        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl">
          <Link
            to={`/roadmap/${strategy.roadmapId}`}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Roadmap
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
              {strategy.industry}
            </Badge>
            <Badge variant="outline">
              {strategy.location}
            </Badge>
            <Badge variant="outline">
              {strategy.stage.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Stage
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            30-Day Content Strategy
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            {monthName} · <span className="text-blue-400">{strategy.items?.length ?? 0} pieces of content</span>
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="container mx-auto px-4 md:px-8 py-12 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(strategy.items ?? []).sort((a, b) => a.day - b.day).map((item) => (
            <Card
              key={item.id}
              className="border-white/[0.07] glass-card-md shadow-none card-hover-glow h-full"
            >
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    Day {item.day}
                  </span>
                </div>

                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${formatBadgeColor(item.format)}`}>
                  {item.format}
                </span>

                <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-3">
                  {item.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mt-auto">
                  {item.topicAngle}
                </p>

                <div className="pt-1 border-t border-border/50">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate block">
                    🔑 {item.primaryKeyword}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
