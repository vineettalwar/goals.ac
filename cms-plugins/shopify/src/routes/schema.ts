import { Router } from "express";
import { hmacAuth } from "../lib/hmac.js";
import { setMetafield, graphqlRequest } from "../lib/shopify-graphql.js";

const router = Router();

interface SchemaRequest {
  type: "jsonld" | "llms_txt" | "meta_config";
  content: string;
  articleId?: string;
  namespace?: string;
  key?: string;
}

const SHOP_METAFILESPACE = "goals_ac";

async function getShopId(): Promise<string> {
  const data = await graphqlRequest<{ shop: { id: string } }>(
    `query { shop { id } }`,
  );
  return data.shop.id;
}

router.post("/schema", hmacAuth, async (req, res) => {
  try {
    const body = req.body as SchemaRequest;

    if (!body.type || !body.content) {
      res.status(400).json({ error: "type and content are required" });
      return;
    }

    const shopId = await getShopId();

    let namespace: string;
    let key: string;
    let value: string;

    switch (body.type) {
      case "jsonld":
        namespace = SHOP_METAFILESPACE;
        key = "jsonld_schema";
        // Validate JSON-LD is valid JSON
        try {
          JSON.parse(body.content);
        } catch {
          res.status(400).json({ error: "content must be valid JSON for jsonld type" });
          return;
        }
        value = body.content;
        break;

      case "llms_txt":
        namespace = SHOP_METAFILESPACE;
        key = "llms_txt";
        value = body.content;
        break;

      case "meta_config":
        namespace = body.namespace ?? SHOP_METAFILESPACE;
        key = body.key ?? "seo_config";
        value = body.content;
        break;

      default:
        res.status(400).json({ error: `Unknown schema type: ${body.type}` });
        return;
    }

    // Store on the shop level (global) or on a specific article
    const ownerId = body.articleId ?? shopId;
    const type = body.type === "jsonld" ? "json_string" : "single_line_text_field";

    const result = await setMetafield(ownerId, namespace, key, value, type);

    res.json({
      stored: true,
      metafield_id: result.id,
      namespace,
      key,
      scope: body.articleId ? "article" : "shop",
    });
  } catch (error) {
    console.error("[schema] Error:", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Unable to store schema configuration" });
  }
});

export default router;
