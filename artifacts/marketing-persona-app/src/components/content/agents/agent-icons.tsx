"use client";

/**
 * Agent Icon Components
 *
 * Maps Lucide icons to each agent's visual identity.
 */

import type { ComponentType } from "react";
import {
  Bird,
  Search,
  Feather,
  Globe,
  Target,
  Languages,
  Eye,
  type LucideProps,
} from "lucide-react";
import type { AgentId } from "@workspace/content-engine/agents/types";
import { ChameleonIcon } from "@workspace/app-shell/chameleon-icon";

export type AgentIcon = ComponentType<LucideProps>;

export const AGENT_ICONS: Record<AgentId, AgentIcon> = {
  owl: Bird,
  ferret: Search,
  hummingbird: Feather,
  spider: Globe,
  fox: Target,
  mockingbird: Languages,
  hawk: Eye,
  chameleon: ChameleonIcon,
};

export function getAgentIcon(agentId: AgentId): AgentIcon {
  return AGENT_ICONS[agentId];
}
