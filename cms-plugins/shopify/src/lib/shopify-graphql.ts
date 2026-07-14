interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
}

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

interface GraphQLErrorResponse {
  errors: GraphQLError[];
  data: Record<string, unknown> | null;
}

function getConfig(): ShopifyConfig {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error("SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN must be set");
  }

  return { shopDomain, accessToken };
}

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isThrottled(errors?: GraphQLError[]): boolean {
  return Boolean(errors?.some((error) => error.extensions?.code === "THROTTLED"));
}

export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  retryOptions: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 10000 } = retryOptions;
  const { shopDomain, accessToken } = getConfig();
  const endpoint = `https://${shopDomain}/admin/api/2026-07/graphql.json`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.min(initialDelayMs * 2 ** attempt, maxDelayMs);
        await sleep(delay);
        continue;
      }
      throw new Error(`Shopify API error (${response.status}): ${text}`);
    }

    const result = (await response.json()) as GraphQLErrorResponse;

    if (isThrottled(result.errors) && attempt < maxRetries) {
      const delay = Math.min(initialDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
      continue;
    }

    if (result.errors?.length) {
      const messages = result.errors.map((e) => e.message).join("; ");
      throw new Error(`GraphQL errors: ${messages}`);
    }

    return result.data as T;
  }

  throw new Error("Shopify GraphQL request failed after retries");
}

export async function queryShop(): Promise<{ name: string; primaryDomain: { host: string } }> {
  const query = `
    query ShopInfo {
      shop {
        name
        primaryDomain {
          host
        }
      }
    }
  `;

  const data = await graphqlRequest<{ shop: { name: string; primaryDomain: { host: string } } }>(query);
  return data.shop;
}

export async function listBlogs(): Promise<Array<{ id: string; title: string; url: string }>> {
  const query = `
    query ListBlogs($first: Int!) {
      blogs(first: $first) {
        edges {
          node {
            id
            title
            url
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    blogs: { edges: Array<{ node: { id: string; title: string; url: string } }> };
  }>(query, { first: 20 });

  return data.blogs.edges.map((e) => e.node);
}

export interface CreateArticleInput {
  blogId: string;
  title: string;
  body: string;
  summary?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  bodyHtml: string;
  summaryHtml: string;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  blog: { id: string; title: string };
}

export async function createArticle(input: CreateArticleInput): Promise<{ article: Article }> {
  const mutation = `
    mutation ArticleCreate($input: ArticleCreateInput!) {
      articleCreate(input: $input) {
        article {
          id
          title
          url
          bodyHtml
          summaryHtml
          tags
          publishedAt
          createdAt
          blog {
            id
            title
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      blogId: input.blogId,
      title: input.title,
      body: input.body,
      summary: input.summary ?? "",
      tags: input.tags ?? [],
      isPublished: input.isPublished ?? true,
      publishedAt: input.publishedAt ?? new Date().toISOString(),
    },
  };

  const data = await graphqlRequest<{
    articleCreate: { article: Article | null; userErrors: Array<{ field: string[]; message: string }> };
  }>(mutation, variables);

  if (data.articleCreate.userErrors.length > 0) {
    const errors = data.articleCreate.userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Article create failed: ${errors}`);
  }

  if (!data.articleCreate.article) {
    throw new Error("Article create returned null");
  }

  return { article: data.articleCreate.article };
}

export async function updateArticle(
  articleId: string,
  input: Partial<CreateArticleInput>,
): Promise<{ article: Article }> {
  const mutation = `
    mutation ArticleUpdate($id: ID!, $input: ArticleUpdateInput!) {
      articleUpdate(id: $id, input: $input) {
        article {
          id
          title
          url
          bodyHtml
          summaryHtml
          tags
          publishedAt
          createdAt
          blog {
            id
            title
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id: articleId,
    input: {
      title: input.title,
      body: input.body,
      summary: input.summary,
      tags: input.tags,
      isPublished: input.isPublished,
      publishedAt: input.publishedAt,
    },
  };

  const data = await graphqlRequest<{
    articleUpdate: { article: Article | null; userErrors: Array<{ field: string[]; message: string }> };
  }>(mutation, variables);

  if (data.articleUpdate.userErrors.length > 0) {
    const errors = data.articleUpdate.userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Article update failed: ${errors}`);
  }

  if (!data.articleUpdate.article) {
    throw new Error("Article update returned null");
  }

  return { article: data.articleUpdate.article };
}

export async function listArticles(
  blogId?: string,
  first: number = 50,
  query?: string,
): Promise<Article[]> {
  const gqlQuery = `
    query ListArticles($first: Int!, $query: String) {
      articles(first: $first, query: $query) {
        edges {
          node {
            id
            title
            url
            bodyHtml
            summaryHtml
            tags
            publishedAt
            createdAt
            blog {
              id
              title
            }
          }
        }
      }
    }
  `;

  let filterQuery = query ?? "";
  if (blogId) {
    filterQuery = filterQuery ? `${filterQuery} AND blog_id:${blogId}` : `blog_id:${blogId}`;
  }

  const data = await graphqlRequest<{
    articles: { edges: Array<{ node: Article }> };
  }>(gqlQuery, { first, query: filterQuery || null });

  return data.articles.edges.map((e) => e.node);
}

export async function listMetafields(
  ownerId: string,
  namespace: string,
): Promise<Array<{ id: string; namespace: string; key: string; value: string; type: string }>> {
  const query = `
    query GetMetafields($ownerId: ID!, $namespace: String!) {
      metafields(first: 50, ownerType: SHOP, namespace: $namespace) {
        edges {
          node {
            id
            namespace
            key
            value
            valueType
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    metafields: {
      edges: Array<{
        node: { id: string; namespace: string; key: string; value: string; valueType: string };
      }>;
    };
  }>(query, { ownerId, namespace });

  return data.metafields.edges.map((e) => ({
    id: e.node.id,
    namespace: e.node.namespace,
    key: e.node.key,
    value: e.node.value,
    type: e.node.valueType,
  }));
}

export async function setMetafield(
  ownerId: string,
  namespace: string,
  key: string,
  value: string,
  type: string = "json_string",
): Promise<{ id: string }> {
  const mutation = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await graphqlRequest<{
    metafieldsSet: {
      metafields: Array<{ id: string }> | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(mutation, {
    metafields: [
      {
        ownerId,
        namespace,
        key,
        value,
        type,
      },
    ],
  });

  if (data.metafieldsSet.userErrors.length > 0) {
    const errors = data.metafieldsSet.userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Metafield set failed: ${errors}`);
  }

  const metafield = data.metafieldsSet.metafields?.[0];
  if (!metafield) {
    throw new Error("Metafield set returned null");
  }

  return metafield;
}

export async function setArticleMetafield(
  articleId: string,
  namespace: string,
  key: string,
  value: string,
  type: string = "json",
): Promise<{ id: string }> {
  return setMetafield(articleId, namespace, key, value, type);
}

export async function setPageMetafield(
  pageId: string,
  namespace: string,
  key: string,
  value: string,
  type: string = "json",
): Promise<{ id: string }> {
  return setMetafield(pageId, namespace, key, value, type);
}

export interface CreatePageInput {
  title: string;
  handle: string;
  body?: string;
  isPublished?: boolean;
  templateSuffix?: string;
}

export interface Page {
  id: string;
  title: string;
  handle: string;
  url: string;
}

async function buildPageUrl(handle: string): Promise<string> {
  const shop = await queryShop();
  const host = shop.primaryDomain?.host;
  if (!host) return `/pages/${handle}`;
  return `https://${host}/pages/${handle}`;
}

export async function createPage(input: CreatePageInput): Promise<{ page: Page }> {
  const mutation = `
    mutation PageCreate($page: PageCreateInput!) {
      pageCreate(page: $page) {
        page {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    page: {
      title: input.title,
      handle: input.handle,
      body: input.body ?? "",
      isPublished: input.isPublished ?? true,
      templateSuffix: input.templateSuffix,
    },
  };

  const data = await graphqlRequest<{
    pageCreate: {
      page: { id: string; title: string; handle: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(mutation, variables);

  if (data.pageCreate.userErrors.length > 0) {
    const errors = data.pageCreate.userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Page create failed: ${errors}`);
  }

  if (!data.pageCreate.page) {
    throw new Error("Page create returned null");
  }

  const url = await buildPageUrl(data.pageCreate.page.handle);
  return {
    page: {
      ...data.pageCreate.page,
      url,
    },
  };
}

export async function updatePage(
  pageId: string,
  input: Partial<CreatePageInput>,
): Promise<{ page: Page }> {
  const mutation = `
    mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
      pageUpdate(id: $id, page: $page) {
        page {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id: pageId,
    page: {
      title: input.title,
      handle: input.handle,
      body: input.body,
      isPublished: input.isPublished,
      templateSuffix: input.templateSuffix,
    },
  };

  const data = await graphqlRequest<{
    pageUpdate: {
      page: { id: string; title: string; handle: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(mutation, variables);

  if (data.pageUpdate.userErrors.length > 0) {
    const errors = data.pageUpdate.userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Page update failed: ${errors}`);
  }

  if (!data.pageUpdate.page) {
    throw new Error("Page update returned null");
  }

  const url = await buildPageUrl(data.pageUpdate.page.handle);
  return {
    page: {
      ...data.pageUpdate.page,
      url,
    },
  };
}

