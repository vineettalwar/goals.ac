/**
 * Agent Roster Definitions
 *
 * The AI agent team for content generation. Each agent has a distinct
 * animal identity, personality, and expertise area.
 */

import type { AgentDefinition, AgentId } from "./agent-types";

export const AGENT_DEFINITIONS: Record<AgentId, AgentDefinition> = {
  owl: {
    id: "owl",
    name: "The Owl",
    role: "Strategist",
    icon: "Bird",
    personality: "Wise, sees the big picture, plans before acting",
    expertise: ["content strategy", "positioning", "audience analysis", "competitive angles"],
    stage: "pre-write",
    order: 0,
    workingMessages: ["Planning"],
  },

  ferret: {
    id: "ferret",
    name: "The Ferret",
    role: "Researcher",
    icon: "Search",
    personality: "Digs deep, sniffs out hidden info, citation-obsessed",
    expertise: ["fact-finding", "source verification", "competitor research", "data gathering"],
    stage: "pre-write",
    order: 1,
    workingMessages: ["Researching"],
  },

  hummingbird: {
    id: "hummingbird",
    name: "The Hummingbird",
    role: "Writer",
    icon: "Feather",
    personality: "Creates beauty rapidly, varied rhythm, narrative-focused",
    expertise: ["prose craft", "storytelling", "engagement", "content flow"],
    stage: "draft",
    order: 2,
    workingMessages: ["Drafting"],
  },

  spider: {
    id: "spider",
    name: "The Spider",
    role: "SEO Specialist",
    icon: "Globe",
    personality: "Weaves structure, knows the web, builds connections",
    expertise: ["keyword optimization", "schema markup", "internal linking", "SERP structure"],
    stage: "optimize",
    order: 3,
    workingMessages: ["Optimizing SEO"],
  },

  fox: {
    id: "fox",
    name: "The Fox",
    role: "Marketing Expert",
    icon: "Target",
    personality: "Clever, persuasive, understands audience psychology",
    expertise: ["conversion copy", "CTAs", "value propositions", "persuasion"],
    stage: "optimize",
    order: 4,
    workingMessages: ["Conversion"],
  },

  mockingbird: {
    id: "mockingbird",
    name: "The Mockingbird",
    role: "Linguist",
    icon: "Languages",
    personality: "Masters language, catches false notes, hates buzzwords",
    expertise: ["clarity", "readability", "anti-slop", "natural phrasing"],
    stage: "polish",
    order: 5,
    workingMessages: ["Editing"],
  },

  hawk: {
    id: "hawk",
    name: "The Hawk",
    role: "Editor",
    icon: "Eye",
    personality: "Sharp eye, catches everything, quality gatekeeper",
    expertise: ["fact-checking", "coherence", "structure", "quality assurance"],
    stage: "polish",
    order: 6,
    workingMessages: ["Reviewing"],
  },

  chameleon: {
    id: "chameleon",
    name: "The Chameleon",
    role: "Brand Voice Coach",
    icon: "Chameleon",
    personality: "Adapts perfectly, matches brand personality",
    expertise: ["voice alignment", "tone matching", "brand consistency", "personality"],
    stage: "polish",
    order: 7,
    workingMessages: ["Matching voice"],
  },
};

/** Ordered list of agents for pipeline execution */
export const AGENT_PIPELINE_ORDER: AgentId[] = [
  "owl",
  "ferret",
  "hummingbird",
  "spider",
  "fox",
  "mockingbird",
  "hawk",
  "chameleon",
];

/** Get agent definition by ID */
export function getAgentDefinition(id: AgentId): AgentDefinition {
  return AGENT_DEFINITIONS[id];
}

/** Get all agents in a specific stage */
export function getAgentsByStage(stage: AgentDefinition["stage"]): AgentDefinition[] {
  return AGENT_PIPELINE_ORDER.map((id) => AGENT_DEFINITIONS[id]).filter((agent) => agent.stage === stage);
}

export function getWorkingMessage(id: AgentId): string {
  return AGENT_DEFINITIONS[id].workingMessages[0]!;
}

/** Get completion message for an agent */
export function getCompletionMessage(id: AgentId): string {
  const agent = AGENT_DEFINITIONS[id];
  switch (id) {
    case "owl":
      return "Strategy defined";
    case "ferret":
      return "Research complete";
    case "hummingbird":
      return "Draft ready";
    case "spider":
      return "SEO optimized";
    case "fox":
      return "Conversion hooks added";
    case "mockingbird":
      return "Language polished";
    case "hawk":
      return "Quality verified";
    case "chameleon":
      return "Voice aligned";
    default:
      return `${agent.role} complete`;
  }
}
