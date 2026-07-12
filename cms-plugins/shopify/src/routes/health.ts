import { Router } from "express";

const router = Router();

const VERSION = "1.0.0";

router.get("/health", (_req, res) => {
  res.json({
    version: VERSION,
    status: "ok",
    platform: "shopify",
    capabilities: {
      drafts: true,
      scheduling: true,
      tags: true,
      metafields: true,
      blogs: true,
      html_content: true,
      markdown_content: false,
      graphql_api: true,
      bulk_operations: true,
    },
    api_version: "2026-07",
  });
});

export default router;
