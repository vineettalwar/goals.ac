import { Router } from "express";
import { hmacAuth } from "../lib/hmac.js";
import { listArticles, listBlogs, type Article } from "../lib/shopify-graphql.js";

const router = Router();

interface SiteGraphArticle {
  remote_id: string;
  title: string;
  url: string;
  slug: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
  blog_id: string;
  blog_title: string;
  summary: string;
}

interface SiteGraphResponse {
  articles: SiteGraphArticle[];
  tags: string[];
  total: number;
  blogs: Array<{ id: string; title: string }>;
}

function extractSlug(url: string): string {
  // Extract slug from Shopify article URL: /blogs/{blog-handle}/{article-handle}
  const parts = url.split("/");
  return parts[parts.length - 1] ?? url;
}

function mapArticle(article: Article): SiteGraphArticle {
  return {
    remote_id: article.id,
    title: article.title,
    url: article.url,
    slug: extractSlug(article.url),
    tags: article.tags,
    published_at: article.publishedAt,
    created_at: article.createdAt,
    blog_id: article.blog.id,
    blog_title: article.blog.title,
    summary: article.summaryHtml ?? "",
  };
}

router.get("/site-graph", hmacAuth, async (req, res) => {
  try {
    const blogId = req.query.blog_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 250);

    // Fetch articles and blogs in parallel
    const [articles, blogs] = await Promise.all([
      listArticles(blogId, limit),
      listBlogs(),
    ]);

    // Extract all unique tags
    const tagSet = new Set<string>();
    for (const article of articles) {
      for (const tag of article.tags) {
        tagSet.add(tag);
      }
    }

    const response: SiteGraphResponse = {
      articles: articles.map(mapArticle),
      tags: Array.from(tagSet).sort(),
      total: articles.length,
      blogs: blogs.map((b) => ({ id: b.id, title: b.title })),
    };

    res.json(response);
  } catch (error) {
    console.error("[site-graph] Error:", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Unable to export site graph" });
  }
});

export default router;
