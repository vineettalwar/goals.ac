import { LEARN_POSTS } from "@/lib/marketing/learn-posts";
import { HELP_ARTICLES } from "@/lib/marketing/help-articles";
import { getSiteUrl } from "@/lib/marketing/site-url";

export function GET() {
  const base = getSiteUrl();

  const lines = [
    "# goals.ac",
    "",
    "> AI-powered B2B content growth engine — persona-driven SEO articles, 12-month roadmaps, GEO audits, and CMS publishing.",
    "",
    "## Product",
    `- [Home](${base}/): Overview of goals.ac`,
    `- [Engagements](${base}/pricing): SEO, AEO, and GEO consulting`,
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
    "## Programmatic",
    `- [Growth roadmaps](${base}/roadmaps): Industry × location SEO roadmaps`,
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
