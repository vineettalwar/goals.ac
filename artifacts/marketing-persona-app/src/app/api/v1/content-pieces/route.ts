import { NextResponse } from "next/server";
import { buildCanonicalContent } from "@workspace/content-engine/content/canonical-content";
import { assertProjectInOrg } from "@workspace/content-engine/support/auth/api-key-auth";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";

export async function POST(req: Request) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "content:read");
    const body = (await req.json().catch(() => null)) as {
      projectId?: number;
      title?: string;
      markdown?: string;
      formatType?: string;
    } | null;

    if (!body?.projectId || !body.title || !body.markdown) {
      return NextResponse.json(
        { error: "projectId, title, and markdown are required" },
        { status: 400 },
      );
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const canonical = buildCanonicalContent({
      title: body.title,
      bodyMarkdown: body.markdown,
      formatType: body.formatType,
    });

    return NextResponse.json(
      {
        canonical,
        message: "Draft accepted — persist via product UI or publish endpoint with piece id",
      },
      { status: 201 },
    );
  });
}
