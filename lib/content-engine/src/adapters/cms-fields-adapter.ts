import { publishToContentful } from "@workspace/connectors/contentful";
import { publishToSanity } from "@workspace/connectors/sanity";
import { publishToStrapi } from "@workspace/connectors/strapi";
import type { CanonicalContent } from "../canonical-content";
import type { CmsIntegrationCredentials } from "../support/cms-integrations";
import { resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import type {
  AdapterPlatformId,
  CmsAdapter,
  PlatformPayload,
  PublishOpts,
  RenderOptions,
  RenderResult,
} from "./types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

async function renderCmsFields(
  content: CanonicalContent,
  platform: AdapterPlatformId,
  creds: CmsIntegrationCredentials,
): Promise<RenderResult> {
  const html = await markdownToHtml(content.markdown);
  const seo = resolveSeoFromCanonical(content);
  const title = seoTitle(content, seo);
  const slug = content.meta.slug ?? slugify(title);

  let fields: Record<string, unknown> = {
    title,
    body: html,
    slug,
  };

  if (platform === "contentful" && creds.contentful) {
    const m = creds.contentful.fieldMapping;
    fields = {
      [m.titleField ?? "title"]: title,
      [m.bodyField ?? "body"]: html,
      [m.slugField ?? "slug"]: slug,
    };
    if (m.metaDescriptionField && seo.metaDescription) {
      fields[m.metaDescriptionField] = seo.metaDescription;
    }
  } else if (platform === "sanity" && creds.sanity) {
    const m = creds.sanity.fieldMapping;
    fields = {
      [m.titleField ?? "title"]: title,
      [m.bodyField ?? "body"]: html,
      [m.slugField ?? "slug"]: { _type: "slug", current: slug },
    };
    if (m.metaDescriptionField && seo.metaDescription) {
      fields[m.metaDescriptionField] = seo.metaDescription;
    }
  } else if (platform === "strapi" && creds.strapi) {
    fields = {
      title,
      content: html,
      slug,
    };
  }

  if (content.meta.faq?.length) {
    fields.faq = content.meta.faq;
  }
  if (content.meta.schemaOrg) {
    fields.jsonLd = content.meta.schemaOrg;
  }

  return {
    payload: { kind: "cms_fields", fields, title, slug },
    warnings: [],
    previewHtml: html,
    previewJson: fields,
  };
}

function createCmsFieldsAdapter(platform: "contentful" | "sanity" | "strapi"): CmsAdapter {
  return {
    platform,
    capabilities: {
      drafts: true,
      scheduling: false,
      updates: true,
      categories: false,
      featuredImage: false,
      schemaInjection: false,
    },

    async render(content: CanonicalContent, opts?: RenderOptions) {
      return renderCmsFields(content, platform, opts?.creds ?? {});
    },

    async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
      if (payload.kind !== "cms_fields") {
        throw new Error(`Invalid payload for ${platform} adapter.`);
      }
      const status = opts?.status === "published" || opts?.status === "publish" ? "published" : "draft";

      if (platform === "contentful") {
        if (!creds.contentful) throw new Error("Contentful is not connected.");
        const result = await publishToContentful(
          creds.contentful,
          payload.title,
          "",
          status,
          payload.fields,
        );
        return { url: result.url, remoteId: result.entryId };
      }
      if (platform === "sanity") {
        if (!creds.sanity) throw new Error("Sanity is not connected.");
        const result = await publishToSanity(creds.sanity, payload.title, "", status, payload.fields);
        return { url: result.url, remoteId: result.documentId };
      }
      if (platform === "strapi") {
        if (!creds.strapi) throw new Error("Strapi is not connected.");
        const result = await publishToStrapi(creds.strapi, payload.title, "", status, payload.fields);
        return { url: result.url, remoteId: result.documentId };
      }
      throw new Error(`Unsupported platform: ${platform}`);
    },
  };
}

export const contentfulAdapter = createCmsFieldsAdapter("contentful");
export const sanityAdapter = createCmsFieldsAdapter("sanity");
export const strapiAdapter = createCmsFieldsAdapter("strapi");
