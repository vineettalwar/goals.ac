import {
  getConnectedDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";
import type { ContentFormatType } from "./content-studio-format-data";
import type { Flow, WizardStepId } from "./create-content-modal-types";

export const STEPS_WITH_ENTER_CONTINUE: WizardStepId[] = [
  "competitors",
  "destination",
  "linkedin-archetype",
  "linkedin-hook",
  "angle",
  "planned-date",
  "review",
  "repurpose-source",
  "optimize-url",
];

export function extractSections(jsonAccumulated: string): string[] {
  const bodyIdx = jsonAccumulated.indexOf('"body_markdown"');
  if (bodyIdx === -1) return [];
  const afterKey = jsonAccumulated.slice(bodyIdx + '"body_markdown"'.length);
  const valueMatch = afterKey.match(/:\s*"([\s\S]*)/);
  if (!valueMatch) return [];
  const rawValue = valueMatch[1];
  const lines = rawValue.split("\\n");
  return lines.flatMap((l) => {
    const trimmed = l.replace(/\\"/g, '"').trim();
    if (!/^#{1,3}\s/.test(trimmed)) return [];
    const heading = trimmed.replace(/^#+\s*/, "").trim();
    return heading ? [heading] : [];
  });
}

export function buildStepSequence(
  flow: Flow,
  selectedFormat: ContentFormatType | null,
  cmsConnections: CmsConnectionSnapshot,
  skipPathAndFormat: boolean,
): WizardStepId[] {
  if (flow === "repurpose") {
    return ["repurpose-format", "repurpose-keyword", "repurpose-source", "repurpose-generating"];
  }

  if (flow === "optimize") {
    return ["optimize-url", "optimize-importing"];
  }

  const steps: WizardStepId[] = [];
  if (!skipPathAndFormat) steps.push("path", "format");
  steps.push("competitors", "keyword");

  if (selectedFormat) {
    const destinations = getConnectedDestinationsForFormat(selectedFormat, cmsConnections);
    if (destinations.length > 0) steps.push("destination");
    if (selectedFormat === "linkedin_post") {
      steps.push("linkedin-archetype", "linkedin-hook");
    }
  }

  steps.push("angle", "planned-date", "review", "generating");
  return steps;
}

export const EMPTY_CMS_CONNECTIONS: CmsConnectionSnapshot = {};
