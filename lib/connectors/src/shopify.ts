import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

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

export async function publishToShopify(
  credentials: ShopifyCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  metaDescription?: string,
  tags?: string[],
): Promise<ShopifyPostResult> {
  const { shopDomain, accessToken } = credentials;
  const resolvedBlogId = await resolveBlogId(
    shopDomain,
    accessToken,
    credentials.blogId,
  );
  const htmlContent = await marked(bodyMarkdown);

  const input: Record<string, unknown> = {
    blogId: resolvedBlogId,
    title,
    body: htmlContent,
    status: status.toUpperCase() as "DRAFT" | "PUBLISHED",
  };
  if (metaDescription) input.summary = metaDescription.slice(0, 300);
  if (tags?.length) input.tags = tags.join(", ");

  const data = await graphql<{
    articleCreate: {
      article?: { id: string; url: string };
      userErrors?: { message: string }[];
    };
  }>(
    shopDomain,
    accessToken,
    `
      mutation articleCreate($input: ArticleInput!) {
        articleCreate(input: $input) {
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
    { input },
  );

  const userErrors = data.articleCreate.userErrors;
  if (userErrors?.length)
    throw new Error(`Shopify articleCreate error: ${userErrors[0].message}`);

  const article = data.articleCreate.article;
  if (!article) throw new Error("Shopify API returned no article.");

  return { articleId: article.id, url: article.url };
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
