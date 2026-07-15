import { withCors } from "@workspace/cf-edge/cors";
import { testWordPressConnection } from "@workspace/connectors/wordpress";
import { testGoalsAcPluginConnection } from "@workspace/connectors/goals-ac-plugin";
import { z } from "zod";

const apiTestSchema = z.object({
  connectionType: z.literal("api").optional(),
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1),
});

const pluginTestSchema = z.object({
  connectionType: z.literal("plugin"),
  siteUrl: z.string().url(),
  siteKey: z.string().min(1),
});

export async function handleWordpressTestWrite(
  request: Request,
  path: string,
  _userId: number,
): Promise<Response | null> {
  if (path !== "/api/wordpress/test" || request.method !== "POST") {
    return null;
  }

  const body = await request.json().catch(() => null);

  const pluginParsed = pluginTestSchema.safeParse(body);
  if (pluginParsed.success) {
    const result = await testGoalsAcPluginConnection({
      siteUrl: pluginParsed.data.siteUrl,
      siteKey: pluginParsed.data.siteKey,
      platform: "wordpress",
    });
    return withCors(
      request,
      Response.json(
        result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error },
      ),
    );
  }

  const apiParsed = apiTestSchema.safeParse(body);
  if (!apiParsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const result = await testWordPressConnection(apiParsed.data);
  return withCors(request, Response.json(result));
}
