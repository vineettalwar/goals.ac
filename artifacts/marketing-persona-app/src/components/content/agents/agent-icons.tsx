"use client";

/**
 * Agent Icon Components
 *
 * Maps Lucide icons to each agent's visual identity.
 */

import {
  Bird,
  Search,
  Feather,
  Globe,
  Target,
  Languages,
  Eye,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "@workspace/content-engine";

export const AGENT_ICONS: Record<AgentId, LucideIcon> = {
  owl: Bird,
  ferret: Search,
  hummingbird: Feather,
  spider: Globe,
  fox: Target,
  mockingbird: Languages,
  hawk: Eye,
  chameleon: Palette,
};

export function getAgentIcon(agentId: AgentId): LucideIcon {
  return AGENT_ICONS[agentId];
}
