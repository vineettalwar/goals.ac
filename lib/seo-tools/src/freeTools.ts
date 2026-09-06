/** Barrel — keep `@workspace/seo-tools/freeTools` stable. */
export type { LlmsTxtPage, LlmsTxtCheck, LlmsTxtResult } from "./free-tools/llms-txt";
export {
  titleFromUrlPath,
  buildLlmsTxtContent,
  scoreLlmsTxtDraft,
  pagePriority,
  generateLlmsTxt,
} from "./free-tools/llms-txt";

export type { RobotsAgentRules, RobotsTxtResult } from "./free-tools/robots";
export { parseRobotsTxt, checkRobotsTxt } from "./free-tools/robots";

export type { SitemapResult } from "./free-tools/sitemap";
export { checkSitemap } from "./free-tools/sitemap";

export type { MetaScoreOptions } from "./free-tools/meta-score";
export { scoreMetaTags } from "./free-tools/meta-score";
