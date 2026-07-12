import { db } from "@workspace/db";
import {
  companiesTable,
  scheduledArticlesTable,
  marketingPersonasTable,
  wordpressConnectionsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContentAgentPanel } from "@/components/content-agent-panel";

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  published: "default",
  generating: "warning",
  pending: "muted",
  failed: "destructive",
};

export function AutopilotContentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="paper-card h-16 bg-secondary/40" />
      <div className="paper-card h-32 bg-secondary/40" />
      <div className="paper-card h-64 bg-secondary/40" />
    </div>
  );
}

export async function AutopilotContent({ userId }: { userId: number }) {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) return null;

  const [personas, articles, wpConnection] = await Promise.all([
    db
      .select()
      .from(marketingPersonasTable)
      .where(eq(marketingPersonasTable.companyId, company.id)),
    db
      .select()
      .from(scheduledArticlesTable)
      .where(eq(scheduledArticlesTable.companyId, company.id))
      .orderBy(desc(scheduledArticlesTable.createdAt))
      .limit(20),
    db
      .select()
      .from(wordpressConnectionsTable)
      .where(eq(wordpressConnectionsTable.companyId, company.id))
      .limit(1),
  ]);

  const wp = wpConnection[0];

  return (
    <>
      <div className="mb-6 paper-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-2 w-2 rounded-full ${wp?.isVerified ? "bg-emerald-500" : "bg-amber-400"}`}
          />
          <span className="text-sm">
            {wp?.isVerified ? (
              <>
                Connected to <strong>{wp.siteUrl}</strong> · Publishing as{" "}
                <strong>{wp.defaultStatus}</strong>
              </>
            ) : (
              "WordPress not connected — articles will be saved as drafts"
            )}
          </span>
        </div>
        <Link
          href="/autopilot/settings"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {wp ? "Change settings" : "Connect WordPress →"}
        </Link>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Personas{" "}
            <span className="ml-1.5 text-muted-foreground font-normal">({personas.length})</span>
          </h2>
          <Link
            href="/autopilot/personas"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {personas.slice(0, 3).map((p) => (
            <div key={p.id} className="paper-card px-3.5 py-2.5 text-sm">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.jobTitle}</p>
            </div>
          ))}
          {personas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No personas yet.{" "}
              <Link href="/autopilot/personas" className="underline">
                Add one →
              </Link>
            </p>
          )}
        </div>
      </div>

      <ContentAgentPanel companyId={company.id} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Article queue</h2>
          <Link
            href="/autopilot/articles"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No articles yet. Click &ldquo;Generate article&rdquo; to create your first one.
            </p>
          </div>
        ) : (
          <div className="paper-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Keyword
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Words
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {articles.map((article, i) => (
                  <tr
                    key={article.id}
                    className={i < articles.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/autopilot/articles/${article.id}`}
                        className="hover:underline font-medium line-clamp-1"
                      >
                        {article.title ?? "Generating..."}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {article.primaryKeyword ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">
                        {article.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {article.wordCount > 0 ? article.wordCount.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {article.status === "ready" && (
                        <Link
                          href={`/autopilot/articles/${article.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Publish →
                        </Link>
                      )}
                      {article.status === "published" && article.publishedUrl && (
                        <a
                          href={article.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          View ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function AutopilotArticlesTableSkeleton() {
  return <div className="paper-card h-64 animate-pulse bg-secondary/40" />;
}

export async function AutopilotArticlesTable({ userId }: { userId: number }) {
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) return null;

  const articles = await db
    .select()
    .from(scheduledArticlesTable)
    .where(eq(scheduledArticlesTable.companyId, company.id))
    .orderBy(desc(scheduledArticlesTable.createdAt));

  if (articles.length === 0) {
    return (
      <div className="paper-card flex items-center justify-center p-16 text-muted-foreground text-sm">
        No articles yet. Click &ldquo;Generate article&rdquo; to create your first one.
      </div>
    );
  }

  return (
    <div className="paper-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Primary keyword
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              AI Source
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Est. Cost
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article, i) => {
            const metadata = (article.articleMetadata ?? {}) as {
              generationSource?: "user-key" | "replit-proxy" | "platform-key";
              estimatedCostUsd?: number;
            };
            return (
              <tr key={article.id} className={i < articles.length - 1 ? "border-b border-border" : ""}>
                <td className="px-4 py-3 max-w-xs">
                  <Link
                    href={`/autopilot/articles/${article.id}`}
                    className="hover:underline font-medium line-clamp-1"
                  >
                    {article.title ?? "Generating..."}
                  </Link>
                  {article.publishedUrl && (
                    <a
                      href={article.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-xs text-muted-foreground hover:text-foreground"
                    >
                      {article.publishedUrl}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {article.primaryKeyword ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">
                      {article.status}
                    </Badge>
                    {article.humanized && <Badge variant="secondary">Humanized</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {article.wordCount > 0 ? article.wordCount.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {metadata.generationSource === "user-key"
                    ? "Your key"
                    : metadata.generationSource
                      ? "Platform"
                      : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {typeof metadata.estimatedCostUsd === "number"
                    ? `~$${metadata.estimatedCostUsd.toFixed(4)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(article.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
