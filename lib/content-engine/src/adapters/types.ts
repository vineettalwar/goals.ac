import type { WebhookArticlePayload } from "@workspace/connectors/webhook";
import type { NotionBlock } from "@workspace/connectors/notion";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import type { WordPressEditorMode } from "../support/publishing/cms-integrations";
import type { PublishEntitlements } from "../support/publishing/publish-entitlements";

export type AdapterPlatformId =
  | "wordpress"
  | "notion"
  | "webflow"
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "typo3"
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot";

export interface AdapterCapabilities {
  drafts: boolean;
  scheduling: boolean;
  updates: boolean;
  categories: boolean;
  featuredImage: boolean;
  schemaInjection: boolean;
  /** Supported content output modes for this platform */
  outputModes?: string[];
  /** @deprecated Use outputModes */
  editorModes?: WordPressEditorMode[];
}

export interface RenderOptions {
  outputMode?: string;
  /** @deprecated Use outputMode — WordPress alias */
  editorMode?: WordPressEditorMode;
  entitlements?: PublishEntitlements;
  status?: "draft" | "publish" | "published";
  creds?: CmsIntegrationCredentials;
}

export interface RenderWarning {
  code: string;
  message: string;
}

export interface RenderResult {
  payload: PlatformPayload;
  warnings: RenderWarning[];
  previewHtml?: string;
  previewJson?: unknown;
}

export interface DrupalLayoutSection {
  layout_id: string;
  layout_settings?: Record<string, unknown>;
  components: Array<{
    type: string;
    uuid: string;
    region: string;
    configuration: Record<string, unknown>;
    additional?: Record<string, unknown>;
  }>;
}

export interface Typo3ContentElement {
  ctype: string;
  fields: Record<string, unknown>;
  colPos?: number;
  sorting?: number;
}

export interface ShopifySectionBlock {
  type: string;
  settings: Record<string, unknown>;
}

export type PlatformPayload =
  | { kind: "html"; html: string; title: string; meta?: Record<string, string> }
  | { kind: "notion_blocks"; blocks: NotionBlock[]; title: string }
  | { kind: "cms_fields"; fields: Record<string, unknown>; title: string; slug?: string }
  | { kind: "webhook"; event: "article.publish"; body: WebhookArticlePayload }
  | {
      kind: "wordpress";
      editorMode: WordPressEditorMode;
      content: string;
      title: string;
      meta: Record<string, string>;
      elementorData?: string;
      tags?: string[];
    }
  | {
      kind: "ghost";
      outputMode: "html" | "lexical";
      title: string;
      html?: string;
      lexical?: string;
      meta?: Record<string, string>;
      /** https or data:image/png|jpeg — uploaded via Ghost Admin images/upload */
      featuredImageUrl?: string;
    }
  | {
      kind: "drupal";
      outputMode: "body_html" | "layout_builder";
      title: string;
      content?: string;
      layout?: { sections: DrupalLayoutSection[] };
      meta?: Record<string, string>;
      tags?: string[];
    }
  | {
      kind: "typo3";
      outputMode: "body_text" | "content_elements";
      title: string;
      content?: string;
      contentElements?: Typo3ContentElement[];
      meta?: Record<string, string>;
    }
  | {
      kind: "shopify";
      outputMode: "article_html" | "article_metafields" | "page_sections";
      title: string;
      content?: string;
      sections?: ShopifySectionBlock[];
      handle?: string;
      meta?: Record<string, string>;
      tags?: string[];
    };

export interface PublishOpts {
  status?: "draft" | "publish" | "published";
  featuredImageId?: number;
  featuredMediaId?: number;
  idempotencyKey?: string;
}

export interface RemoteRef {
  url: string;
  remoteId?: string | number;
}

export interface CmsAdapter {
  readonly platform: AdapterPlatformId;
  readonly capabilities: AdapterCapabilities;
  render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult>;
  publish(
    creds: CmsIntegrationCredentials,
    payload: PlatformPayload,
    opts?: PublishOpts,
  ): Promise<RemoteRef>;
}
