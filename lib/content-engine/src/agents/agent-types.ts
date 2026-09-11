/**
 * Agent Team Types
 *
 * Defines the AI agent roster for content generation pipeline.
 * Each agent has a distinct animal identity, personality, and role.
 */

export type AgentId =
  | "owl"
  | "ferret"
  | "hummingbird"
  | "spider"
  | "fox"
  | "mockingbird"
  | "hawk"
  | "chameleon";

export type AgentStage = "pre-write" | "draft" | "optimize" | "polish";

export type AgentStatus = "pending" | "starting" | "working" | "completed" | "failed" | "skipped";

/** Error codes for agent pipeline failures */
export type AgentErrorCode =
  | "MISSING_KEYWORD"
  | "MISSING_BRAND"
  | "MISSING_FORMAT"
  | "INVALID_OUTPUT"
  | "TIMEOUT"
  | "EMPTY_RESPONSE"
  | "INVALID_JSON"
  | "CRITICAL_WRITER_FAILURE"
  | "MISSING_TITLE"
  | "MISSING_CONTENT";

export interface AgentDefinition {
  /** Unique identifier matching AgentId */
  id: AgentId;
  /** Display name: "The Owl", "The Ferret", etc. */
  name: string;
  /** Role title: "Strategist", "Researcher", etc. */
  role: string;
  /** Lucide icon name: "Bird", "Search", etc. */
  icon: string;
  /** Short personality description for UI tooltips */
  personality: string;
  /** Domain expertise tags for UI display */
  expertise: string[];
  /** Pipeline stage grouping */
  stage: AgentStage;
  /** Order in pipeline (0-7) */
  order: number;
  /** Working status messages the agent might emit */
  workingMessages: string[];
}

export interface AgentProgressEvent {
  /** Which agent is reporting */
  agent: AgentId;
  /** Current status */
  status: AgentStatus;
  /** Human-readable status message */
  message: string;
  /** Milliseconds spent on this stage (set on completion) */
  durationMs?: number;
  /** Optional metadata from the agent's work */
  metadata?: Record<string, unknown>;
}

export interface AgentStageResult {
  /** The agent that produced this result */
  agentId: AgentId;
  /** Whether this stage succeeded */
  success: boolean;
  /** Output data passed to the next agent */
  output: unknown;
  /** Error message if failed */
  error?: string;
  /** Time taken in ms */
  durationMs: number;
}

export interface AgentPipelineResult {
  /** Final content piece output */
  content: {
    title: string;
    body_markdown: string;
    target_keyword: string;
    meta_description?: string;
    secondary_keywords?: string[];
    faq_section?: { question: string; answer: string }[];
    citations?: { text: string; url: string; source: string }[];
    internal_link_suggestions?: { anchorText: string; suggestedSlug: string; rationale?: string }[];
    json_ld_schema?: object;
  };
  /** Results from each agent stage */
  stages: AgentStageResult[];
  /** Total pipeline duration in ms */
  totalDurationMs: number;
  /** Agents that were skipped or failed */
  degradedAgents: AgentId[];
}

/** Pipeline configuration options */
export interface AgentPipelineOptions {
  /** Skip specific agents (for fast mode) */
  skipAgents?: AgentId[];
  /** Callback for progress events */
  onProgress?: (event: AgentProgressEvent) => void;
  /** Timeout per agent in ms (default 60000) */
  agentTimeoutMs?: number;
}
