import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import { cleanAndParse } from "../core/utils";
import { resolveAiClient } from "../support/ai/resolve-ai-client";

export interface PersonaInput {
  companyName: string;
  websiteUrl: string;
  industry: string;
  description: string;
  targetAudience: string;
}

export interface GeneratedPersona {
  name: string;
  ageRange: string;
  jobTitle: string;
  painPoints: string[];
  goals: string[];
  preferredContent: string[];
}

export interface GeneratePersonasOptions {
  aiClient?: AiProviderClient;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}

const SYSTEM_PROMPT = `You are a senior marketing strategist. Generate detailed, realistic Ideal Customer Profile (ICP) personas for a company. Each persona must be specific, psychologically grounded, and immediately actionable for content planning.

Respond ONLY with a valid JSON array. No prose, no markdown fences, no explanation.`;

async function resolvePersonaClient(options?: GeneratePersonasOptions): Promise<AiProviderClient> {
  if (options?.aiClient) return options.aiClient;
  if (options?.userApiKey !== undefined || options?.aiProviderOptions) {
    return resolveAiClient(options?.userApiKey, options?.aiProviderOptions);
  }
  return getAiProviderClient();
}

export async function generatePersonas(
  input: PersonaInput,
  options?: GeneratePersonasOptions,
): Promise<GeneratedPersona[]> {
  const ai = await resolvePersonaClient(options);

  const prompt = `Generate 3 distinct marketing personas for the following company:

Company: ${input.companyName}
Website: ${input.websiteUrl}
Industry: ${input.industry}
Description: ${input.description}
Target audience: ${input.targetAudience}

For each persona return a JSON object with these exact fields:
- name: string — a vivid, descriptive persona archetype name (e.g. "The Overwhelmed Growth Marketer")
- ageRange: string — e.g. "32-42"
- jobTitle: string — specific title and context (e.g. "Head of Marketing at a Series B SaaS startup")
- painPoints: string[] — 4-5 specific, tangible pain points this persona experiences
- goals: string[] — 3-4 professional goals they are actively trying to achieve
- preferredContent: string[] — 3-4 content formats they actually consume (e.g. "how-to guides", "case studies", "short video tutorials")

Return ONLY a JSON array with exactly 3 persona objects.`;

  const response = await ai.generate({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    maxOutputTokens: 4096,
    thinkingBudget: 0,
  });

  const raw = response.text ?? "";
  return cleanAndParse<GeneratedPersona[]>(raw);
}
