import { publishToGoalsAcPlugin } from "./goals-ac-plugin";
import type { GoalsAcContentElement, GoalsAcPublishPayload } from "./goals-ac-plugin";

export interface Typo3Credentials {
  connectionType: "api" | "plugin";
  siteUrl: string;
  siteKey: string;
  outputMode?: "body_text" | "content_elements";
}

export interface Typo3PostResult {
  postId: string;
  url: string;
}

export interface Typo3PublishInput {
  title: string;
  content?: string;
  status?: "draft" | "published";
  outputMode?: "body_text" | "content_elements";
  contentElements?: GoalsAcContentElement[];
  meta?: Record<string, string>;
  slug?: string;
  updateId?: string | number;
  replaceStrategy?: "managed_only" | "full_replace";
}

export interface Typo3PublishOptions {
  idempotencyKey?: string;
  markdown?: boolean;
}

export async function publishToTypo3(
  credentials: Typo3Credentials,
  input: Typo3PublishInput,
  options?: Typo3PublishOptions,
): Promise<Typo3PostResult>;
export async function publishToTypo3(
  credentials: Typo3Credentials,
  title: string,
  bodyMarkdown: string,
  status?: "draft" | "published",
  options?: Typo3PublishOptions,
): Promise<Typo3PostResult>;
export async function publishToTypo3(
  credentials: Typo3Credentials,
  titleOrInput: string | Typo3PublishInput,
  bodyMarkdownOrOptions?: string | Typo3PublishOptions,
  status: "draft" | "published" = "draft",
  options?: Typo3PublishOptions,
): Promise<Typo3PostResult> {
  let input: Typo3PublishInput;
  let publishOptions: Typo3PublishOptions | undefined;

  if (typeof titleOrInput === "string") {
    input = {
      title: titleOrInput,
      content: typeof bodyMarkdownOrOptions === "string" ? bodyMarkdownOrOptions : "",
      status,
      outputMode: credentials.outputMode ?? "body_text",
    };
    publishOptions = options;
  } else {
    input = titleOrInput;
    publishOptions =
      bodyMarkdownOrOptions && typeof bodyMarkdownOrOptions !== "string"
        ? bodyMarkdownOrOptions
        : options;
  }

  const outputMode = input.outputMode ?? credentials.outputMode ?? "body_text";
  const publishStatus = input.status ?? status;

  const payload: GoalsAcPublishPayload = {
    title: input.title,
    content: input.content ?? "",
    status: publishStatus === "published" ? "publish" : "draft",
    output_mode: outputMode,
    meta: input.meta,
    slug: input.slug,
    update_id: input.updateId,
    replace_strategy: input.replaceStrategy ?? "managed_only",
  };

  if (outputMode === "content_elements" && input.contentElements?.length) {
    payload.content_elements = input.contentElements;
    payload.content = "";
  }

  const result = await publishToGoalsAcPlugin(
    {
      siteUrl: credentials.siteUrl,
      siteKey: credentials.siteKey,
      platform: "typo3",
    },
    payload,
    {
      markdown: publishOptions?.markdown ?? outputMode === "body_text",
      idempotencyKey: publishOptions?.idempotencyKey,
    },
  );

  return { postId: String(result.remote_id), url: result.url };
}

export async function testTypo3Connection(
  credentials: Typo3Credentials,
): Promise<{ ok: boolean; error?: string }> {
  const { testGoalsAcPluginConnection } = await import("./goals-ac-plugin");
  const result = await testGoalsAcPluginConnection({
    siteUrl: credentials.siteUrl,
    siteKey: credentials.siteKey,
    platform: "typo3",
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
