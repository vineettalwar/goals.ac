import { publishToGoalsAcPlugin } from "./goals-ac-plugin";

export interface Typo3Credentials {
  connectionType: "api" | "plugin";
  siteUrl: string;
  siteKey: string;
}

export interface Typo3PostResult {
  postId: string;
  url: string;
}

export async function publishToTypo3(
  credentials: Typo3Credentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
): Promise<Typo3PostResult> {
  const result = await publishToGoalsAcPlugin(
    {
      siteUrl: credentials.siteUrl,
      siteKey: credentials.siteKey,
      platform: "typo3",
    },
    {
      title,
      content: bodyMarkdown,
      status: status === "published" ? "publish" : "draft",
    },
    { markdown: true },
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
