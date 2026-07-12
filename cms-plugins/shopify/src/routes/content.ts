import { Router } from "express";
import { hmacAuth } from "../lib/hmac.js";
import { createArticle, updateArticle, type Article } from "../lib/shopify-graphql.js";
import { getCachedResponse, setCachedResponse } from "../lib/idempotency.js";
import { badRequest } from "../lib/errors.js";

const router = Router();

interface ContentRequest {
  title: string;
  content: string;
  status?: "publish" | "draft" | "scheduled";
  slug?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
  blogId?: string;
  updateId?: string;
  publishedAt?: string;
  summary?: string;
}

interface ContentResponse {
  remote_id: string;
  url: string;
  action: "created" | "updated";
}

router.post("/content", hmacAuth, async (req, res) => {
    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

    // Check idempotency cache
    if (idempotencyKey) {
      const cached = getCachedResponse(idempotencyKey);
      if (cached) {
        res.status(cached.statusCode).json(cached.response);
        return;
      }
    }

    const body = req.body as ContentRequest;

    // Validate required fields
    if (!body.title || !body.content) {
      throw badRequest("MISSING_FIELDS", "title and content are required");
    }

    const blogId = body.blogId ?? process.env.SHOPIFY_DEFAULT_BLOG_ID;
    if (!blogId) {
      throw badRequest("MISSING_BLOG_ID", "blogId is required (provide in body or SHOPIFY_DEFAULT_BLOG_ID env)");
    }

    // Determine publish status
    const isPublished = body.status === "publish" || body.status === undefined;
    const publishedAt = body.status === "scheduled" && body.publishedAt
      ? body.publishedAt
      : isPublished
        ? new Date().toISOString()
        : undefined;

    // Determine action: update existing or create new
    let result: { article: Article };
    let action: "created" | "updated";

    if (body.updateId) {
      // Update existing article
      result = await updateArticle(body.updateId, {
        title: body.title,
        body: body.content,
        summary: body.summary,
        tags: body.tags,
        isPublished,
        publishedAt,
      });
      action = "updated";
    } else {
      // Create new article
      result = await createArticle({
        blogId,
        title: body.title,
        body: body.content,
        summary: body.summary,
        tags: body.tags,
        isPublished,
        publishedAt,
      });
      action = "created";
    }

    const response: ContentResponse = {
      remote_id: result.article.id,
      url: result.article.url,
      action,
    };

    const statusCode = action === "created" ? 201 : 200;

    // Cache for idempotency
    if (idempotencyKey) {
      setCachedResponse(idempotencyKey, response, statusCode);
    }

    res.status(statusCode).json(response);
});

export default router;
