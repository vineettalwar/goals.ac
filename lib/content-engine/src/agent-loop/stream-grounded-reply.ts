import { modelForProviderTier } from "@workspace/ai-providers";
import { resolveAiClientForUser } from "../support/ai/resolve-ai-client-for-user";
import { composeGroundedReply, type ChatIntent } from "./seo-chat-format";
import { trajectoryHasVerifiedEvidence, type TrajectoryStep } from "./types";

export type GroundingPack = {
  verified: boolean;
  citations: string[];
  missing: string[];
  facts: string[];
  question?: string;
};

export function buildGroundingPack(input: {
  trajectory?: TrajectoryStep[];
  question?: string;
  extraFacts?: string[];
}): GroundingPack {
  const citations: string[] = [];
  const missing: string[] = [];
  const facts: string[] = [...(input.extraFacts ?? [])];
  for (const step of input.trajectory ?? []) {
    if (step.evidenceRefs?.length) {
      for (const ref of step.evidenceRefs) {
        if (ref.verified && ref.source) citations.push(ref.source);
      }
    }
    if (step.summary) {
      if (/not connected|no .*row|missing|empty|not configured|not verified/i.test(step.summary)) {
        missing.push(step.summary);
      } else if (step.ok && step.tool) {
        facts.push(`${step.tool}: ${step.summary}`);
      }
    }
  }
  return {
    verified: trajectoryHasVerifiedEvidence(input.trajectory ?? []),
    citations: [...new Set(citations)].slice(0, 8),
    missing: [...new Set(missing)].slice(0, 8),
    facts: facts.slice(0, 16),
    question: input.question,
  };
}

export function groundedReplySystemPrompt(pack: GroundingPack): string {
  return `You are the goals.ac SEO chat. Reply in plain language. Use ONLY the grounding pack. Never invent metrics, click counts, positions, or citations. If a number is not in the pack, say it is missing. Unverified claims must be labeled as not verified. Do not use em dashes.
Verified: ${pack.verified}
Citations: ${pack.citations.join("; ") || "(none)"}
Missing: ${pack.missing.join("; ") || "(none)"}
Facts: ${pack.facts.join(" | ") || "(none)"}
${pack.question ? `Ask this next: ${pack.question}` : ""}`;
}

export async function streamGroundedAssistantReply(input: {
  userId: number;
  userText: string;
  intent: ChatIntent;
  run: {
    status: string;
    stopReason: string | null;
    trajectory: TrajectoryStep[];
    contentPieceId?: number | null;
    id?: number;
  } | null;
  pack: GroundingPack;
  onDelta: (text: string) => void | Promise<void>;
}): Promise<{ content: string; citations: string[]; missing: string[]; verified: boolean; streamed: boolean }> {
  const fallback = composeGroundedReply({
    intent: input.intent,
    text: input.userText,
    run: input.run,
    missingExtras: input.pack.missing,
  });
  try {
    const resolved = await resolveAiClientForUser(input.userId);
    const model = modelForProviderTier(resolved.providerId, "rapid");
    const params = {
      prompt: input.userText,
      systemInstruction: groundedReplySystemPrompt(input.pack),
      temperature: 0.2,
      maxOutputTokens: 700,
      ...(model ? { model } : {}),
    };
    let content = "";
    if (resolved.client.generateStream) {
      for await (const chunk of resolved.client.generateStream(params)) {
        if (!chunk) continue;
        content += chunk;
        await input.onDelta(chunk);
      }
    } else {
      const out = await resolved.client.generate(params);
      content = out.text.trim();
      if (content) await input.onDelta(content);
    }
    content = content.trim();
    if (!content) return { ...fallback, streamed: false };
    if (!input.pack.verified && /\b\d[\d,]*\s+clicks\b/i.test(content)) {
      return { ...fallback, streamed: false };
    }
    return {
      content,
      citations: input.pack.citations,
      missing: input.pack.missing,
      verified: input.pack.verified,
      streamed: true,
    };
  } catch {
    return { ...fallback, streamed: false };
  }
}
