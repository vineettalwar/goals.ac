import { LEARN_POSTS } from "@/lib/marketing/content/learn-posts";
import { HELP_ARTICLES } from "@/lib/marketing/content/help-articles";
import { getSiteUrl } from "@/lib/marketing/site/site-url";

export function GET() {
  const base = getSiteUrl();

  const lines = [
    "# goals.ac",
    "",
    "> Cross-platform content studio — research-driven SEO briefs, drafts you approve, and publishing to CMS, social, and email.",
    "",
    "## Product",
    `- [Home](${base}/): Overview of goals.ac`,
    `- [Content Studio](${base}/content-engine): Research, draft, and publish workflow`,
    `- [Engagements](${base}/pricing): Scoped content programs`,
    `- [Features](${base}/features): Content studio, autopilot, integrations`,
    `- [Generative Engine Optimization](${base}/generative-engine-optimization): GEO tooling`,
    `- [LLM Visibility](${base}/llm-visibility): Track AI search citations`,
    `- [Free GEO Audit](${base}/geo-audit): Audit any URL for AI search readiness`,
    `- [Free Tools](${base}/free-tools): llms.txt generator, robots checker, and more`,
    "",
    "## Learn",
    ...LEARN_POSTS.map((p) => `- [${p.title}](${base}/learn/${p.slug}): ${p.description}`),
    "",
    "## Help",
    ...HELP_ARTICLES.slice(0, 12).map((a) => `- [${a.title}](${base}/help/${a.slug})`),
    "",
    "## Resources",
    `- [Compare AI SEO tools](${base}/compare/ai-seo-tools)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
