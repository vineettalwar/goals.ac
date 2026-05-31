import { getAiClient } from "./gemini-client";
import { cleanAndParse } from "./utils";

export interface TopicalCluster {
  pillarTopic: string;          // e.g. "B2B Lead Generation"
  pillarKeyword: string;        // primary keyword
  searchVolume: string;         // estimated e.g. "2,400/mo"
  difficulty: "low" | "medium" | "high";
  covered: boolean;             // do we have an article for this?
  supportingTopics: {
    title: string;
    keyword: string;
    searchVolume: string;
    difficulty: "low" | "medium" | "high";
    covered: boolean;
    searchIntent: "informational" | "commercial" | "transactional";
  }[];
}

export interface TopicalMapResult {
  topicalAuthority: number;     // 0-100 score based on coverage
  clusters: TopicalCluster[];
  quickWinKeywords: string[];   // low-difficulty, uncovered
  contentGaps: string[];        // high-value topics missing
  recommendedNextArticle: string;
}

export async function generateTopicalMap(input: {
  company: { name: string; industry: string; description: string; targetAudience: string; websiteUrl: string };
  existingArticleTitles: string[];
  primaryKeywords?: string[];
}): Promise<TopicalMapResult> {
  const ai = getAiClient();

  const covered = input.existingArticleTitles.length > 0
    ? `Already covered topics (existing articles): ${input.existingArticleTitles.join("; ")}`
    : "No articles published yet.";

  const seedKeywords = input.primaryKeywords?.length
    ? `Seed keywords/topics to build around: ${input.primaryKeywords.join(", ")}`
    : "";

  const prompt = `You are a senior SEO strategist. Build a topical authority map for:

Company: ${input.company.name}
Website: ${input.company.websiteUrl}
Industry: ${input.company.industry}
Description: ${input.company.description}
Target audience: ${input.company.targetAudience}
${seedKeywords}

${covered}

Create a topical authority map that will help this company dominate their niche in Google and AI search engines. Mark topics as "covered: true" only if they clearly match an existing article above.

Return a JSON object with:
- topicalAuthority: number 0-100 (current coverage score based on existing articles)
- clusters: array of TopicalCluster — 4-6 pillar topics, each with 3-5 supporting topics. For each:
  - pillarTopic: string
  - pillarKeyword: string
  - searchVolume: estimated monthly searches (realistic B2B estimates)
  - difficulty: "low" | "medium" | "high"
  - covered: boolean
  - supportingTopics: array of { title, keyword, searchVolume, difficulty, covered, searchIntent }
- quickWinKeywords: string[] — top 5 uncovered keywords with low difficulty
- contentGaps: string[] — top 5 high-value topic gaps (not yet covered)
- recommendedNextArticle: string — single best next article to write (title)

Be specific to this company's niche. Realistic volume estimates. Focus on keywords real buyers search.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  const raw = response.text ?? "";
  return cleanAndParse<TopicalMapResult>(raw);
}
