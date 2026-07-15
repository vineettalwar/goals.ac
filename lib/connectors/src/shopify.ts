import { marked } from "marked";
import {
  downloadAndOptimizeImage,
  optimizeImageBuffer,
  type OptimizedImage,
} from "@workspace/media";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./wordpress-images";

export interface ShopifyCredentials {
  shopDomain: string; // e.g. "mystore.myshopify.com"
  accessToken: string; // Admin API access token
  blogId?: string; // gid://shopify/Blog/... — auto-detect first blog if omitted
}

export interface ShopifyPostResult {
  articleId: string; // gid://shopify/Article/...
  url: string;
}

function graphqlEndpoint(shopDomain: string): string {
  return `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin/api/2026-07/graphql.json`;
}

function makeHeaders(accessToken: string): Record<string, string> {
  return {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

async function graphql<T = unknown>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = graphqlEndpoint(shopDomain);
  await assertPublicUrl(url);

  const res = await fetch(url, {
    method: "POST",
    headers: makeHeaders(accessToken),
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 402)
      throw new Error(
        "Shopify authentication failed. Check your access token.",
      );
    if (res.status === 403)
      throw new Error(
        "Shopify access token does not have the required scopes.",
      );
    throw new Error(`Shopify API error: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length)
    throw new Error(`Shopify GraphQL error: ${json.errors[0].message}`);
  if (!json.data) throw new Error("Shopify API returned no data.");
  return json.data;
}

async function resolveBlogId(
  shopDomain: string,
  accessToken: string,
  blogId?: string,
): Promise<string> {
  if (blogId) return blogId;

  const data = await graphql<{
    blogs: { edges: { node: { id: string } }[] };
  }>(
    shopDomain,
    accessToken,
    `
      {
        blogs(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `,
  );

  const firstBlog = data.blogs.edges[0]?.node;
  if (!firstBlog)
    throw new Error(
      "No blogs found in this Shopify store. Create at least one blog first.",
    );
  return firstBlog.id;
}

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
};

/**
 * Staged upload → Shopify temp resource URL suitable for ArticleImageInput.url.
 * resource: FILE — works with write_content blog apps without a separate fileCreate.
 */
export async function uploadShopifyStagedImage(
  credentials: ShopifyCredentials,
  params: { buffer: Buffer; filename: string; mimeType: string },
): Promise<{ resourceUrl: string }> {
  const { shopDomain, accessToken } = credentials;
  const data = await graphql<{
    stagedUploadsCreate: {
      stagedTargets?: StagedTarget[];
      userErrors?: { message: string }[];
    };
  }>(
    shopDomain,
    accessToken,
    `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            message
          }
        }
      }
    `,
    {
      input: [
        {
          filename: params.filename,
          mimeType: params.mimeType,
          resource: "FILE",
          httpMethod: "POST",
          fileSize: String(params.buffer.byteLength),
        },
      ],
    },
  );

  const errors = data.stagedUploadsCreate.userErrors;
  if (errors?.length) {
    throw new Error(`Shopify stagedUploadsCreate error: ${errors[0].message}`);
  }
  const target = data.stagedUploadsCreate.stagedTargets?.[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error("Shopify stagedUploadsCreate returned no target.");
  }

  await assertPublicUrl(target.url);

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append("file", blob, params.filename);

  const uploadRes = await fetch(target.url, { method: "POST", body: form });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(`Shopify staged file upload failed: ${uploadRes.status} ${text}`);
  }

  return { resourceUrl: target.resourceUrl };
}

/**
 * Resolve featured image to a URL for ArticleCreateInput.image.
 * Accepts https (staged when possible, else direct URL) or data:image/png|jpeg.
 */
export async function resolveShopifyArticleImage(
  credentials: ShopifyCredentials,
  featuredImageUrl?: string | null,
  altText?: string,
): Promise<{ url: string; altText?: string } | undefined> {
  const raw = featuredImageUrl?.trim();
  if (!raw) return undefined;

  let optimized: OptimizedImage;
  let httpsFallback: string | undefined;

  if (isRasterFeaturedDataUri(raw)) {
    const decoded = decodeRasterFeaturedDataUri(raw);
    if (!decoded) return undefined;
    optimized = await optimizeImageBuffer(decoded.buffer, "featured", {
      maxWidth: 1920,
      quality: 85,
    });
  } else if (/^https?:\/\//i.test(raw)) {
    httpsFallback = raw;
    optimized = await downloadAndOptimizeImage(raw, "featured", {
      maxWidth: 1920,
      quality: 85,
    });
  } else {
    return undefined;
  }

  try {
    const uploaded = await uploadShopifyStagedImage(credentials, {
      buffer: optimized.buffer,
      filename: optimized.filename,
      mimeType: optimized.mimeType,
    });
    return {
      url: uploaded.resourceUrl,
      ...(altText?.trim() ? { altText: altText.trim() } : {}),
    };
  } catch {
    // Official ArticleImageInput path: Shopify fetches a public https URL.
    if (httpsFallback) {
      return {
        url: httpsFallback,
        ...(altText?.trim() ? { altText: altText.trim() } : {}),
      };
    }
    return undefined;
  }
}

export async function publishToShopify(
  credentials: ShopifyCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  metaDescription?: string,
  tags?: string[],
  featuredImageUrl?: string | null,
  imageAltText?: string,
): Promise<ShopifyPostResult> {
  const { shopDomain, accessToken } = credentials;
  const resolvedBlogId = await resolveBlogId(
    shopDomain,
    accessToken,
    credentials.blogId,
  );
  const htmlContent = await marked(bodyMarkdown);
  const image = await resolveShopifyArticleImage(
    credentials,
    featuredImageUrl,
    imageAltText,
  );

  const article: Record<string, unknown> = {
    blogId: resolvedBlogId,
    title,
    body: htmlContent,
    isPublished: status === "published",
    author: { name: "goals.ac" },
  };
  if (metaDescription) article.summary = metaDescription.slice(0, 300);
  if (tags?.length) article.tags = tags;
  if (image) article.image = image;

  const data = await graphql<{
    articleCreate: {
      article?: { id: string; url: string };
      userErrors?: { message: string }[];
    };
  }>(
    shopDomain,
    accessToken,
    `
      mutation articleCreate($article: ArticleCreateInput!) {
        articleCreate(article: $article) {
          article {
            id
            url
          }
          userErrors {
            message
          }
        }
      }
    `,
    { article },
  );

  const userErrors = data.articleCreate.userErrors;
  if (userErrors?.length)
    throw new Error(`Shopify articleCreate error: ${userErrors[0].message}`);

  const created = data.articleCreate.article;
  if (!created) throw new Error("Shopify API returned no article.");

  return { articleId: created.id, url: created.url };
}

export async function testShopifyConnection(
  credentials: ShopifyCredentials,
): Promise<{ ok: boolean; shopName?: string; error?: string }> {
  try {
    const { shopDomain, accessToken } = credentials;
    const data = await graphql<{ shop: { name: string } }>(
      shopDomain,
      accessToken,
      `
        {
          shop {
            name
          }
        }
      `,
    );

    return { ok: true, shopName: data.shop.name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
