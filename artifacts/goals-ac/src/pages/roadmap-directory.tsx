import { Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { useListRoadmaps, getListRoadmapsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, ArrowRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function RoadmapDirectory() {
  const { data, isLoading } = useListRoadmaps(
    {},
    {
      query: {
        queryKey: getListRoadmapsQueryKey({}),
      },
    }
  );

  const formatStage = (stage: string) => {
    return stage.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <Layout>
      <SEO
        title="All Roadmaps | goals.ac"
        description="Browse our directory of data-driven growth roadmaps for B2B startups across various industries and locations."
      />

      <div className="bg-zinc-950 text-zinc-50 py-16 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Growth Strategy Directory
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Explore AI-generated, actionable 12-month growth roadmaps for startups across different industries and maturity stages.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-6xl">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex gap-2 mb-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <Skeleton className="h-4 w-1/3" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : data?.roadmaps && data.roadmaps.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">Recent Roadmaps</h2>
              <span className="text-sm text-muted-foreground">{data.total} total strategies</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.roadmaps.map((roadmap) => (
                <Link key={roadmap.id} to={`/roadmap/${roadmap.slug}`}>
                  <Card className="h-full flex flex-col hover:border-primary/50 transition-colors cursor-pointer group shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {roadmap.industry}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatStage(roadmap.stage)}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight leading-snug group-hover:text-primary transition-colors">
                        Growth Strategy for {roadmap.location} Startups
                      </h3>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-center text-sm text-muted-foreground gap-2 mb-4">
                        <TrendingUp className="w-4 h-4" />
                        <span>12-month execution plan</span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 pt-4 flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{roadmap.viewCount} views</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-foreground group-hover:text-primary transition-colors">
                        View Plan <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24 bg-muted/30 rounded-xl border border-border border-dashed">
            <h3 className="text-lg font-medium mb-2">No roadmaps found</h3>
            <p className="text-muted-foreground mb-6">Be the first to generate a growth strategy.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8"
            >
              Generate Roadmap
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
