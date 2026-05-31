import { getAiClient } from "./gemini-client";
import { cleanAndParse } from "./utils";

export interface ArticleInput {
  company: {
    name: string;
    websiteUrl: string;
    industry: string;
    description: string;
    targetAudience: string;
  };
  persona: {
    name: string;
    jobTitle: string;
    painPoints: string[];
    goals: string[];
    preferredContent: string[];
  } | null;
  keyword?: string;
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  bodyMarkdown: string;
  wordCount: number;
}

const SYSTEM_PROMPT = `You are an expert SEO content writer and strategist. Write high-quality, well-researched articles that genuinely help the target reader.

Writing principles:
- Be specific and concrete — no vague generalities
- Use real examples, data points, and actionable steps
- Write naturally for humans, not keyword density
- Structure with clear headings, short paragraphs, and lists where helpful
- Avoid AI-sounding filler phrases like "In today's fast-paced world" or "In conclusion"

Respond ONLY with a valid JSON object. No prose, no markdown fences outside the bodyMarkdown field.`;

export async function generateArticle(input: ArticleInput): Promise<GeneratedArticle> {
  const ai = getAiClient();

  const personaContext = input.persona
    ? `
Target reader persona: ${input.persona.name} (${input.persona.jobTitle})
Their pain points: ${input.persona.painPoints.slice(0, 3).join("; ")}
Their goals: ${input.persona.goals.slice(0, 2).join("; ")}
Content they prefer: ${input.persona.preferredContent.join(", ")}`
    : `Target reader: ${input.company.targetAudience}`;

  const keywordContext = input.keyword
    ? `Target keyword to rank for: "${input.keyword}"`
    : `Select the most valuable SEO keyword for ${input.company.name} in ${input.company.industry} based on the audience context.`;

  const prompt = `Write a 1200-1500 word SEO article for ${input.company.name} (${input.company.websiteUrl}), a company in the ${input.company.industry} industry.

Company description: ${input.company.description}
${personaContext}

${keywordContext}

Return a JSON object with these fields:
- title: string — compelling, SEO-optimized headline
- metaDescription: string — 150-160 character meta description
- primaryKeyword: string — the main keyword this article targets
- secondaryKeywords: string[] — 3-5 related keywords naturally used in the article
- bodyMarkdown: string — the full article in clean Markdown (use ## for H2, ### for H3, - for bullets). 1200-1500 words.
- wordCount: number — approximate word count of bodyMarkdown

The article should directly address the persona's pain points and help them achieve their goals.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  const raw = response.text ?? "";
  return cleanAndParse<GeneratedArticle>(raw);
}
