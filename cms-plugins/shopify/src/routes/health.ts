import { Router } from "express";

const router = Router();

const VERSION = "0.2.0";
const OUTPUT_MODES = ["article_html", "article_metafields", "page_sections"] as const;
const THEME_SECTION_TYPES = ["rich-text", "image-with-text"];

router.get("/health", (_req, res) => {
  res.json({
    version: VERSION,
    status: "ok",
    platform: "shopify",
    cms_version: "2026-07",
    output_modes: OUTPUT_MODES,
    recommended_output_mode: "article_html",
    theme_section_types: THEME_SECTION_TYPES,
    capabilities: {
      drafts: true,
      scheduling: true,
      tags: true,
      metafields: true,
      blogs: true,
      pages: true,
      html_content: true,
      markdown_content: false,
      graphql_api: true,
      bulk_operations: true,
      output_modes: OUTPUT_MODES,
      theme_section_types: THEME_SECTION_TYPES,
    },
    api_version: "2026-07",
  });
});

export default router;
