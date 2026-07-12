import { Router } from "express";
import { hmacAuth } from "../lib/hmac.js";
import { setMetafield, graphqlRequest } from "../lib/shopify-graphql.js";
import { badRequest } from "../lib/errors.js";

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
    const body = req.body as SchemaRequest;

    if (!body.type || !body.content) {
      throw badRequest("MISSING_FIELDS", "type and content are required");
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
          throw badRequest("INVALID_JSON_LD", "content must be valid JSON for jsonld type");
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
        throw badRequest("INVALID_SCHEMA_TYPE", `Unknown schema type: ${String(body.type)}`);
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
});

export default router;
