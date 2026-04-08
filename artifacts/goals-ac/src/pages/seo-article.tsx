import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Copy, Check, ArrowLeft, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SeoArticle {
  id: number;
  roadmapId: number | null;
  brandName: string;
  websiteUrl: string;
  industry: string;
  location: string;
  stage: string;
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  content: string;
  wordCount: number;
  status: string;
  createdAt: string;
}

async function fetchSeoArticle(id: string): Promise<SeoArticle> {
  const res = await fetch(`${API_BASE}/api/seo-articles/${id}`);
  if (!res.ok) {
    throw new Error("Article not found");
  }
  return res.json() as Promise<SeoArticle>;
}

export default function SeoArticlePage() {
  const { id = "" } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["seo-article", id],
    queryFn: () => fetchSeoArticle(id),
    enabled: !!id,
  });

  const handleCopy = async () => {
    if (!article) return;
    await navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-24 text-center max-w-3xl">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">
            This SEO article does not exist or has been removed.
          </p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={`${article.title} | goals.ac`} description={article.metaDescription} />

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          {article.roadmapId ? (
            <Link
              to={`/roadmap/${article.roadmapId}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Roadmap
            </Link>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          )}

          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Article
              </>
            )}
          </Button>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
            {article.title}
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-5">
            {article.metaDescription}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {article.primaryKeyword}
            </Badge>
            {article.secondaryKeywords.map((kw) => (
              <Badge key={kw} variant="secondary">
                {kw}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground border-t border-border/40 pt-4">
            <span>{article.brandName}</span>
            <span>·</span>
            <span>{article.wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{article.industry}</span>
            <span>·</span>
            <span>{article.location}</span>
          </div>
        </header>

        {/* Article Body */}
        <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-base prose-li:leading-relaxed">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </article>

        {/* Footer CTA */}
        <div className="mt-12 border-t border-border/40 pt-8 flex items-center justify-between flex-wrap gap-4">
          {article.roadmapId ? (
            <Link to={`/roadmap/${article.roadmapId}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Roadmap
              </Button>
            </Link>
          ) : (
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          )}

          <Button onClick={handleCopy} variant="default">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Article
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
