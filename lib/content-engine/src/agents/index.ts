/**
 * Agent Team Module
 *
 * Exports all agent-related types, definitions, and utilities.
 */

// Types
export * from "./agent-types";

// Definitions
export * from "./agent-definitions";

// Prompts
export * from "./agent-prompts";

// Events
export * from "./agent-events";

// Job progress persistence (onboarding poll)
export {
  foldAgentProgressEvent,
  patchPieceAgentTeamProgress,
  type AgentTeamProgressSnapshot,
} from "./agent-team-progress-persist";

// Orchestrator
export {
  runAgentPipeline,
  runFastAgentPipeline,
  runMinimalAgentPipeline,
  runWriterOnlyPipeline,
  validateAgentConfiguration,
  AgentPipelineError,
  shouldReplaceBody,
  type AgentOrchestratorInput,
} from "./agent-orchestrator";
