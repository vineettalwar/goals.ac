import { Router } from "express";
import { hmacAuth } from "../lib/hmac.js";
import {
  createArticle,
  createPage,
  setArticleMetafield,
  setPageMetafield,
  updateArticle,
  updatePage,
  type Article,
  type ArticleImageInput,
  type Page,
} from "../lib/shopify-graphql.js";
import { getCachedResponse, setCachedResponse } from "../lib/idempotency.js";
import { badRequest } from "../lib/errors.js";

const router = Router();

const DEFAULT_OUTPUT_MODE = "article_html";
const DEFAULT_METAFIELD_NAMESPACE = "goals_ac";
const DEFAULT_METAFIELD_KEY = "content_sections";
const DEFAULT_TEMPLATE_SUFFIX = "goals-ac";

// article_metafields / page_sections write JSON metafields only. Storefront
// rendering needs a theme Liquid snippet (not shipped as a theme app block yet).
// Partners: copy cms-plugins/shopify/theme-snippets/ into the merchant theme —
// see docs/cms-plugins/shopify-theme-sections.md.

interface ShopifySection {
  type: string;
  settings: Record<string, unknown>;
}

interface ContentRequest {
  title: string;
  content?: string;
  status?: "publish" | "draft" | "scheduled";
  slug?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
  blogId?: string;
  updateId?: string;
  publishedAt?: string;
  summary?: string;
  output_mode?: string;
  sections?: ShopifySection[];
  metafield_namespace?: string;
  metafield_key?: string;
  template_suffix?: string;
  /** Public https URL for ArticleCreateInput.image (mirrors Admin connector). */
  featuredImageUrl?: string;
}

/** Remote https only — plugin has no staged upload; data: URIs are ignored. */
function resolveArticleImage(body: ContentRequest): ArticleImageInput | undefined {
  const raw = body.featuredImageUrl?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  const altText = body.title?.trim();
  return altText ? { url: raw, altText } : { url: raw };
}

interface ContentResponse {
  remote_id: string;
  url: string;
  action: "created" | "updated";
}

function resolveOutputMode(body: ContentRequest): string {
  return body.output_mode?.trim() || DEFAULT_OUTPUT_MODE;
}

function resolveHandle(body: ContentRequest): string {
  const raw = body.slug?.trim();
  if (raw) return raw;
  return body.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255) || "page";
}

async function publishArticleMetafields(
  body: ContentRequest,
  isPublished: boolean,
  publishedAt: string | undefined,
): Promise<{ remote_id: string; url: string; action: "created" | "updated" }> {
  if (!body.sections?.length) {
    throw badRequest("MISSING_SECTIONS", "sections are required for article_metafields output_mode");
  }

  const blogId = body.blogId ?? process.env.SHOPIFY_DEFAULT_BLOG_ID;
  if (!blogId) {
    throw badRequest("MISSING_BLOG_ID", "blogId is required (provide in body or SHOPIFY_DEFAULT_BLOG_ID env)");
  }

  const namespace = body.metafield_namespace ?? DEFAULT_METAFIELD_NAMESPACE;
  const key = body.metafield_key ?? DEFAULT_METAFIELD_KEY;
  const bodyHtml = body.content ?? "";

  let article: Article;
  let action: "created" | "updated";

  if (body.updateId) {
    const result = await updateArticle(body.updateId, {
      title: body.title,
      body: bodyHtml,
      summary: body.summary,
      tags: body.tags,
      isPublished,
      publishedAt,
    });
    article = result.article;
    action = "updated";
  } else {
    const result = await createArticle({
      blogId,
      title: body.title,
      body: bodyHtml,
      summary: body.summary,
      tags: body.tags,
      isPublished,
      publishedAt,
      image: resolveArticleImage(body),
    });
    article = result.article;
    action = "created";
  }

  await setArticleMetafield(
    article.id,
    namespace,
    key,
    JSON.stringify(body.sections),
    "json",
  );

  return { remote_id: article.id, url: article.url, action };
}

async function publishPageSections(
  body: ContentRequest,
  isPublished: boolean,
): Promise<{ remote_id: string; url: string; action: "created" | "updated" }> {
  if (!body.sections?.length) {
    throw badRequest("MISSING_SECTIONS", "sections are required for page_sections output_mode");
  }

  const handle = resolveHandle(body);
  const namespace = body.metafield_namespace ?? DEFAULT_METAFIELD_NAMESPACE;
  const key = body.metafield_key ?? DEFAULT_METAFIELD_KEY;
  const templateSuffix = body.template_suffix ?? DEFAULT_TEMPLATE_SUFFIX;
  const bodyHtml = body.content ?? "";

  let page: Page;
  let action: "created" | "updated";

  if (body.updateId) {
    const result = await updatePage(body.updateId, {
      title: body.title,
      handle,
      body: bodyHtml,
      isPublished,
      templateSuffix,
    });
    page = result.page;
    action = "updated";
  } else {
    const result = await createPage({
      title: body.title,
      handle,
      body: bodyHtml,
      isPublished,
      templateSuffix,
    });
    page = result.page;
    action = "created";
  }

  await setPageMetafield(
    page.id,
    namespace,
    key,
    JSON.stringify(body.sections),
    "json",
  );

  return { remote_id: page.id, url: page.url, action };
}

router.post("/content", hmacAuth, async (req, res) => {
    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

    if (idempotencyKey) {
      const cached = getCachedResponse(idempotencyKey);
      if (cached) {
        res.status(cached.statusCode).json(cached.response);
        return;
      }
    }

    const body = req.body as ContentRequest;
    const outputMode = resolveOutputMode(body);

    if (!body.title) {
      throw badRequest("MISSING_FIELDS", "title is required");
    }

    if (outputMode === "article_html" && !body.content) {
      throw badRequest("MISSING_FIELDS", "title and content are required for article_html");
    }

    const isPublished = body.status === "publish" || body.status === undefined;
    const publishedAt = body.status === "scheduled" && body.publishedAt
      ? body.publishedAt
      : isPublished
        ? new Date().toISOString()
        : undefined;

    let response: ContentResponse;

    if (outputMode === "article_metafields") {
      response = await publishArticleMetafields(body, isPublished, publishedAt);
    } else if (outputMode === "page_sections") {
      response = await publishPageSections(body, isPublished);
    } else {
      if (!body.content) {
        throw badRequest("MISSING_FIELDS", "title and content are required");
      }

      const blogId = body.blogId ?? process.env.SHOPIFY_DEFAULT_BLOG_ID;
      if (!blogId) {
        throw badRequest("MISSING_BLOG_ID", "blogId is required (provide in body or SHOPIFY_DEFAULT_BLOG_ID env)");
      }

      let result: { article: Article };
      let action: "created" | "updated";

      if (body.updateId) {
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
        result = await createArticle({
          blogId,
          title: body.title,
          body: body.content,
          summary: body.summary,
          tags: body.tags,
          isPublished,
          publishedAt,
          image: resolveArticleImage(body),
        });
        action = "created";
      }

      response = {
        remote_id: result.article.id,
        url: result.article.url,
        action,
      };
    }

    const statusCode = response.action === "created" ? 201 : 200;

    if (idempotencyKey) {
      setCachedResponse(idempotencyKey, response, statusCode);
    }

    res.status(statusCode).json(response);
});

export default router;
