import type { ConnectionMethod, PublishDestinationId } from "../../projects/publishing-destinations";
import {
  getDefaultOutputMode,
  getOutputModes,
  outputModeLabel,
} from "@workspace/content-engine/support/publishing/platform-output-modes";

export type ConnectionFieldType = "text" | "password" | "url" | "number" | "select";

export interface ConnectionFieldOption {
  value: string;
  label: string;
}

export interface ConnectionFieldDef {
  key: string;
  label: string;
  type: ConnectionFieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  options?: ConnectionFieldOption[];
  when?: {
    connectionMethod?: ConnectionMethod[];
    authType?: string[];
  };
}

export interface ConnectedDetailRow {
  label: string;
  value: string;
}

export interface CmsConnectionSchema {
  fields: ConnectionFieldDef[];
  buildPayload: (
    values: Record<string, string>,
    connectionMethod: ConnectionMethod,
  ) => unknown;
  canSubmit: (
    values: Record<string, string>,
    connectionMethod: ConnectionMethod,
  ) => boolean;
  connectedDetails: (integration: Record<string, unknown>) => ConnectedDetailRow[];
  resetValues: () => Record<string, string>;
}

export function trim(values: Record<string, string>, key: string): string {
  return (values[key] ?? "").trim();
}

export function has(values: Record<string, string>, key: string): boolean {
  return trim(values, key).length > 0;
}

export function buildOutputModeField(platform: string): ConnectionFieldDef {
  const options = getOutputModes(platform);
  const defaultMode = getDefaultOutputMode(platform);
  return {
    key: "outputMode",
    label: "Output format",
    type: "select",
    defaultValue: defaultMode,
    options: options.map((option) => ({ value: option.value, label: option.label })),
    hint:
      options.find((option) => option.value === defaultMode)?.hint ??
      "How goals.ac formats content for this platform.",
  };
}

export function resolveStoredOutputMode(platform: string, integration: Record<string, unknown>): string {
  if (platform === "wordpress") {
    return String(integration.outputMode ?? integration.editorMode ?? getDefaultOutputMode(platform));
  }
  return String(integration.outputMode ?? getDefaultOutputMode(platform));
}

export function outputModeDetailRow(
  platform: string,
  integration: Record<string, unknown>,
): ConnectedDetailRow | null {
  const mode = resolveStoredOutputMode(platform, integration);
  if (!mode) return null;
  return { label: "Output format", value: outputModeLabel(platform, mode) };
}

export function appendOutputMode(values: Record<string, string>, platform: string): Record<string, unknown> {
  const outputMode = trim(values, "outputMode") || getDefaultOutputMode(platform);
  if (platform === "wordpress") {
    return { outputMode, editorMode: outputMode };
  }
  return { outputMode };
}

export type PartialSchemas = Partial<Record<PublishDestinationId, CmsConnectionSchema>>;
