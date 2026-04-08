import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import {
  useListContentStrategies,
  useGetContentStrategy,
  useUpdateContentItem,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET;

function useAdminGuard() {
  const [searchParams] = useSearchParams();
  const secret = searchParams.get("secret");
  const envSecret = ADMIN_SECRET;
  if (envSecret) {
    return secret === envSecret;
  }
  return !!secret;
}

function StrategyDetail({ id, secret }: { id: number; secret: string }) {
  const { data: strategy, isLoading } = useGetContentStrategy(id);
  const updateItem = useUpdateContentItem();

  if (isLoading || !strategy) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const toggleStatus = (itemId: number, currentStatus: string) => {
    const newStatus = currentStatus === "prepared" ? "draft" : "prepared";
    updateItem.mutate({
      id,
      itemId,
      data: { status: newStatus as "draft" | "prepared" | "published" },
    });
  };

  const prepared = (strategy.items ?? []).filter((i) => i.status === "prepared").length;
  const total = strategy.items?.length ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/content-strategies?secret=${secret}`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            All Strategies
          </Link>
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {prepared}/{total} prepared
        </div>
      </div>

      <div className="space-y-2">
        {(strategy.items ?? []).sort((a, b) => a.day - b.day).map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
              item.status === "prepared"
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-background border-border/50"
            }`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 mt-0.5 h-6 w-6"
              onClick={() => toggleStatus(item.id, item.status)}
              disabled={updateItem.isPending}
              title={item.status === "prepared" ? "Mark as draft" : "Mark as prepared"}
            >
              {item.status === "prepared" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">Day {item.day}</span>
                <Badge variant="outline" className="text-xs">
                  {item.format}
                </Badge>
                {item.status === "prepared" && (
                  <Badge className="text-xs bg-green-600 text-white">Prepared</Badge>
                )}
              </div>
              <h4 className="text-sm font-semibold leading-snug">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.topicAngle}</p>
              <p className="text-xs text-primary mt-1 font-medium">🔑 {item.primaryKeyword}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminContentStrategies() {
  const [searchParams] = useSearchParams();
  const secret = searchParams.get("secret") ?? "";
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const isAuthorized = useAdminGuard();

  const { data: strategies, isLoading } = useListContentStrategies({
    query: { enabled: isAuthorized },
  });

  if (!isAuthorized) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Provide the admin secret via <code className="bg-muted px-1 rounded">?secret=...</code> query parameter.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Content Strategies</h1>
          <p className="text-muted-foreground text-sm">Browse and prepare AI-generated 30-day content plans.</p>
        </div>

        {selectedId ? (
          <StrategyDetail id={selectedId} secret={secret} />
        ) : (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : !strategies || strategies.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>No content strategies generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <Card
                    key={strategy.id}
                    className="border-border/50 hover:border-primary/40 cursor-pointer transition-colors shadow-sm"
                    onClick={() => setSelectedId(strategy.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <span>{strategy.industry}</span>
                        <span className="text-muted-foreground font-normal">·</span>
                        <span className="font-normal text-muted-foreground">{strategy.location}</span>
                        <span className="text-muted-foreground font-normal">·</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {strategy.stage}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">
                        Generated {format(new Date(strategy.createdAt), "MMMM d, yyyy")} ·{" "}
                        {format(new Date(strategy.year, strategy.month - 1, 1), "MMMM yyyy")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
