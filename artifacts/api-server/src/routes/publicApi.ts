import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  authenticateApiKey,
  assertProjectInOrg,
  checkApiKeyRateLimit,
  requireApiKeyScope,
  type AuthenticatedApiKey,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { getAdapterCapabilities, listAdaptedPlatforms } from "@workspace/content-engine/adapters/registry";
import { renderContentForPlatform, renderAndPublish } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { buildCanonicalContent } from "@workspace/content-engine/content/canonical-content";
import { withPublishRecord } from "@workspace/content-engine/support/publishing/publish-records";

declare global {
  namespace Express {
    interface Request {
      apiKey?: AuthenticatedApiKey;
    }
  }
}

const router: IRouter = Router();

async function requirePublicApiKey(req: Request, res: Response, next: NextFunction) {
  const key = await authenticateApiKey(req.headers.authorization);
  if (!key) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }
  if (!checkApiKeyRateLimit(key)) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }
  req.apiKey = key;
  next();
}

router.use(requirePublicApiKey);

/** GET /v1/connections?projectId= */
router.get("/v1/connections", async (req, res) => {
  try {
    requireApiKeyScope(req.apiKey!, "content:read");
    const projectId = Number(req.query.projectId);
    if (!projectId) {
      res.status(400).json({ error: "projectId query param required" });
      return;
    }
    await assertProjectInOrg(projectId, req.apiKey!.organizationId);

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const platforms = listAdaptedPlatforms().filter((p) => Boolean(creds[p as keyof typeof creds]));

    res.json({
      projectId,
      connections: platforms.map((platform) => ({
        platform,
        capabilities: getAdapterCapabilities(platform),
      })),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Request failed" });
  }
});

/** POST /v1/content/render */
router.post("/v1/content/render", async (req, res) => {
  try {
    requireApiKeyScope(req.apiKey!, "render:preview");
    const { projectId, platform, markdown, title, editorMode } = req.body as {
      projectId?: number;
      platform?: string;
      markdown?: string;
      title?: string;
      editorMode?: string;
    };
    if (!projectId || !platform || !markdown || !title) {
      res.status(400).json({ error: "projectId, platform, markdown, and title are required" });
      return;
    }
    await assertProjectInOrg(projectId, req.apiKey!.organizationId);

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const entitlements = await resolveEntitlementsForOrg(req.apiKey!.organizationId);

    const preview = await renderContentForPlatform({
      piece: { title, bodyMarkdown: markdown },
      platform,
      creds,
      editorMode: editorMode as "classic" | "gutenberg" | "elementor" | "divi" | undefined,
      entitlements,
    });

    if (!entitlements.renderNativePayloads && preview.payloadKind !== "html") {
      res.status(403).json({
        error: "Native platform payloads require BYOK or Growth plan",
        payloadKind: preview.payloadKind,
      });
      return;
    }

    res.json(preview);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Render failed" });
  }
});

/** POST /v1/content-pieces/:id/publish */
router.post("/v1/content-pieces/:id/publish", async (req, res) => {
  try {
    requireApiKeyScope(req.apiKey!, "publish:write");
    const id = Number(req.params.id);
    const { platform, projectId } = req.body as { platform?: string; projectId?: number };
    if (!id || !platform || !projectId) {
      res.status(400).json({ error: "platform and projectId are required" });
      return;
    }
    await assertProjectInOrg(projectId, req.apiKey!.organizationId);

    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);
    if (!piece || piece.websiteProjectId !== projectId) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const entitlements = await resolveEntitlementsForOrg(req.apiKey!.organizationId);

    const publishOutcome = await withPublishRecord(
      {
        contentPieceId: id,
        websiteProjectId: projectId,
        provider: platform,
      },
      async (idempotencyKey) => {
        const result = await renderAndPublish({
          piece: {
            id: piece.id,
            title: piece.title,
            bodyMarkdown: piece.bodyMarkdown,
            targetKeyword: piece.targetKeyword,
            formatType: piece.formatType,
            pieceMetadata: piece.pieceMetadata,
          },
          platform,
          creds,
          entitlements,
          idempotencyKey,
        });

        return {
          publishedUrl: result.url,
          publishPlatform: platform,
          outputMode: result.outputMode,
        };
      },
    );

    await db
      .update(contentPiecesTable)
      .set({
        status: "published",
        publishedUrl: publishOutcome.publishedUrl,
        publishPlatform: platform,
        publishError: null,
      })
      .where(eq(contentPiecesTable.id, id));

    res.json({ publishedUrl: publishOutcome.publishedUrl, platform });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Publish failed" });
  }
});

/** POST /v1/content-pieces — ingest external draft markdown */
router.post("/v1/content-pieces", async (req, res) => {
  try {
    requireApiKeyScope(req.apiKey!, "content:read");
    const { projectId, title, markdown, formatType } = req.body as {
      projectId?: number;
      title?: string;
      markdown?: string;
      formatType?: string;
    };
    if (!projectId || !title || !markdown) {
      res.status(400).json({ error: "projectId, title, and markdown are required" });
      return;
    }
    await assertProjectInOrg(projectId, req.apiKey!.organizationId);

    const canonical = buildCanonicalContent({ title, bodyMarkdown: markdown, formatType });

    res.status(201).json({
      canonical,
      message: "Draft accepted — persist via product UI or publish endpoint with piece id",
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Ingest failed" });
  }
});

export default router;
