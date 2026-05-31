import { auth } from "@/auth";
import { db } from "@workspace/db";
import {
  companiesTable,
  scheduledArticlesTable,
  marketingPersonasTable,
  wordpressConnectionsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GenerateArticleButton } from "./generate-article-button";

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  published: "default",
  generating: "warning",
  pending: "muted",
  failed: "destructive",
};

export default async function AutopilotPage() {
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) redirect("/onboarding");

  const [personas, articles, wpConnection] = await Promise.all([
    db.select().from(marketingPersonasTable).where(eq(marketingPersonasTable.companyId, company.id)),
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
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> Autopilot
          </h1>
          <p className="mt-1 text-muted-foreground">
            {company.name} · Automated SEO content pipeline
          </p>
        </div>
        <GenerateArticleButton companyId={company.id} />
      </div>

      {/* WordPress status */}
      <div className="mb-6 paper-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${wp?.isVerified ? "bg-emerald-500" : "bg-amber-400"}`} />
          <span className="text-sm">
            {wp?.isVerified ? (
              <>Connected to <strong>{wp.siteUrl}</strong> · Publishing as <strong>{wp.defaultStatus}</strong></>
            ) : (
              "WordPress not connected — articles will be saved as drafts"
            )}
          </span>
        </div>
        <Link href="/autopilot/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {wp ? "Change settings" : "Connect WordPress →"}
        </Link>
      </div>

      {/* Personas */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Personas <span className="ml-1.5 text-muted-foreground font-normal">({personas.length})</span></h2>
          <Link href="/autopilot/personas" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
            <p className="text-sm text-muted-foreground">No personas yet. <Link href="/autopilot/personas" className="underline">Add one →</Link></p>
          )}
        </div>
      </div>

      {/* Articles */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Article queue</h2>
          <Link href="/autopilot/articles" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="text-muted-foreground text-sm">No articles yet. Click &ldquo;Generate article&rdquo; to create your first one.</p>
          </div>
        ) : (
          <div className="paper-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Keyword</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {articles.map((article, i) => (
                  <tr key={article.id} className={i < articles.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-3">
                      <Link href={`/autopilot/articles/${article.id}`} className="hover:underline font-medium line-clamp-1">
                        {article.title ?? "Generating..."}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{article.primaryKeyword ?? "—"}</td>
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
                        <Link href={`/autopilot/articles/${article.id}`} className="text-xs text-primary hover:underline">
                          Publish →
                        </Link>
                      )}
                      {article.status === "published" && article.publishedUrl && (
                        <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
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
    </div>
  );
}
