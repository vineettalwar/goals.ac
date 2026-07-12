import { auth } from "@/auth";
import { db } from "@workspace/db";
import { scheduledArticlesTable, companiesTable, wordpressConnectionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArticleActions } from "./article-actions";
import { ArrowLeft, ExternalLink, Clock, Target, BookOpen, Link2, Wallet } from "lucide-react";

interface ArticleMetadata {
  citations?: { text: string; url: string; source: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object;
  personaAlignment?: string;
  searchIntent?: string;
  readingTimeMinutes?: number;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale: string }[];
  generationSource?: "user-key" | "replit-proxy" | "platform-key";
  estimatedCostUsd?: number;
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

const STATUS_VARIANT = {
  published: "default" as const,
  ready: "success" as const,
  failed: "destructive" as const,
  generating: "warning" as const,
  pending: "muted" as const,
};

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const rows = await db
    .select({
      article: scheduledArticlesTable,
      company: companiesTable,
      wp: wordpressConnectionsTable,
    })
    .from(scheduledArticlesTable)
    .innerJoin(companiesTable, eq(companiesTable.id, scheduledArticlesTable.companyId))
    .leftJoin(wordpressConnectionsTable, eq(wordpressConnectionsTable.companyId, companiesTable.id))
    .where(and(eq(scheduledArticlesTable.id, parseInt(id, 10)), eq(companiesTable.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const { article, wp } = row;
  const meta = (article.articleMetadata ?? {}) as ArticleMetadata;

  // Render markdown to basic HTML (no extra deps)
  const renderMarkdown = (md: string) =>
    md
      .replace(/^# .+\n?/m, "")
      .split("\n")
      .map((line) => {
        if (line.startsWith("## ")) return `<h2 class="text-lg font-semibold mt-6 mb-2">${line.slice(3)}</h2>`;
        if (line.startsWith("### ")) return `<h3 class="font-semibold mt-4 mb-1">${line.slice(4)}</h3>`;
        if (line.startsWith("- ")) return `<li class="ml-4 list-disc">${line.slice(2)}</li>`;
        if (line.startsWith("**") && line.endsWith("**")) return `<p class="font-semibold mt-3">${line.slice(2, -2)}</p>`;
        if (line.trim() === "") return "";
        // inline bold + links
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>');
        return `<p class="mt-2 leading-relaxed">${formatted}</p>`;
      })
      .join("")
      .replace(/(<li.*<\/li>)+/g, (m) => `<ul class="my-2 space-y-1">${m}</ul>`);

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/autopilot/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All articles
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant={STATUS_VARIANT[article.status as keyof typeof STATUS_VARIANT] ?? "muted"} className="capitalize">
              {article.status}
            </Badge>
            {meta.searchIntent && <Badge variant="muted">{meta.searchIntent}</Badge>}
            {meta.generationSource && (
              <Badge variant="muted">
                {meta.generationSource === "user-key" ? "Your API key" : "Platform AI"}
              </Badge>
            )}
            {meta.readingTimeMinutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {meta.readingTimeMinutes} min read
              </span>
            )}
            {typeof meta.estimatedCostUsd === "number" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" /> ~${meta.estimatedCostUsd.toFixed(4)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-snug">{article.title ?? "Untitled"}</h1>
          {article.primaryKeyword && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{article.primaryKeyword}</span>
              {article.secondaryKeywords.length > 0 && (
                <> · {article.secondaryKeywords.join(", ")}</>
              )}
            </p>
          )}
        </div>
        <ArticleActions
          articleId={article.id}
          status={article.status}
          hasWordPress={!!wp?.isVerified}
          publishedUrl={article.publishedUrl ?? undefined}
          companyId={row.company.id}
        />
      </div>

      {/* Persona alignment insight */}
      {meta.personaAlignment && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-primary font-medium">{meta.personaAlignment}</p>
        </div>
      )}

      {/* Meta description */}
      {article.metaDescription && (
        <div className="paper-card p-4 rounded-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Meta description ({article.metaDescription.length}/160)</p>
          <p className="text-sm">{article.metaDescription}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Article body */}
        <div className="lg:col-span-2">
          {article.bodyMarkdown ? (
            <div className="paper-card rounded-xl p-8">
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(article.bodyMarkdown) }}
              />
              {article.wordCount > 0 && (
                <p className="mt-6 text-xs text-muted-foreground border-t border-(--border) pt-4">
                  {article.wordCount.toLocaleString()} words
                </p>
              )}
            </div>
          ) : (
            <div className="paper-card rounded-xl flex items-center justify-center p-16 text-muted-foreground text-sm">
              {article.status === "generating" ? "Generating article…" : "No content yet"}
            </div>
          )}
        </div>

        {/* Sidebar: citations + internal links */}
        <div className="space-y-4">
          {/* Citations */}
          {meta.citations && meta.citations.length > 0 && (
            <div className="paper-card rounded-xl p-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" /> Sources & Citations
              </h3>
              <ul className="space-y-2">
                {meta.citations.map((c, i) => (
                  <li key={i}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-xs group"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary" />
                      <span>
                        <span className="font-medium text-primary group-hover:underline">{c.source}</span>
                        <span className="text-muted-foreground block">{c.text}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Internal link suggestions */}
          {meta.internalLinkSuggestions && meta.internalLinkSuggestions.length > 0 && (
            <div className="paper-card rounded-xl p-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-primary" /> Internal Link Opportunities
              </h3>
              <ul className="space-y-3">
                {meta.internalLinkSuggestions.map((link, i) => (
                  <li key={i} className="text-xs space-y-0.5">
                    <p className="font-medium">"{link.anchorText}"</p>
                    <p className="text-muted-foreground font-mono">{link.suggestedSlug}</p>
                    <p className="text-muted-foreground">{link.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* JSON-LD schema preview */}
          {meta.jsonLdSchema && (
            <div className="paper-card rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-3">JSON-LD Schema</h3>
              <p className="text-xs text-muted-foreground mb-2">Add this to your page &lt;head&gt; for rich results</p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {`<script type="application/ld+json">\n${JSON.stringify(meta.jsonLdSchema, null, 2)}\n</script>`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
