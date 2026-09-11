import {
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./linkedin-archetypes";
import { formatTypeLabel } from "./types";
import type { CreateFlow } from "./create-content-types";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground break-words">{value}</span>
    </div>
  );
}

export function ReviewStep({
  flow,
  formatType,
  targetKeyword,
  title,
  isLinkedIn,
  linkedinArchetype,
  linkedinHook,
  angleHint,
  sourceContent,
  sessionCompetitorUrls,
  focusCompetitorUrl,
  selectedDestinationLabel,
  plannedDate,
  onChangePlannedDate,
  showAgentTeamToggle = false,
  useAgentTeam = false,
  onChangeUseAgentTeam,
  agentFastMode = false,
  onChangeAgentFastMode,
}: {
  flow: CreateFlow;
  formatType: string;
  targetKeyword: string;
  title: string;
  isLinkedIn: boolean;
  linkedinArchetype: LinkedInArchetypeId | "";
  linkedinHook: LinkedInHookId | "";
  angleHint: string;
  sourceContent: string;
  sessionCompetitorUrls: string[];
  focusCompetitorUrl: string;
  selectedDestinationLabel: string | null;
  plannedDate: string;
  onChangePlannedDate: (value: string) => void;
  showAgentTeamToggle?: boolean;
  useAgentTeam?: boolean;
  onChangeUseAgentTeam?: (value: boolean) => void;
  agentFastMode?: boolean;
  onChangeAgentFastMode?: (value: boolean) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      {flow === "create" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            Planned date{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            type="date"
            autoFocus
            value={plannedDate}
            onChange={(event) => onChangePlannedDate(event.target.value)}
            className="h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm"
          />
        </label>
      ) : null}

      {showAgentTeamToggle && flow === "create" && onChangeUseAgentTeam ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={useAgentTeam}
              onChange={(e) => onChangeUseAgentTeam(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              <span className="font-medium text-foreground">Agent team</span>
              {" — "}specialists (Owl, Ferret, Hummingbird…) draft and polish. Slower, higher quality.
            </span>
          </label>
          {useAgentTeam && onChangeAgentFastMode ? (
            <label className="ml-7 flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={agentFastMode}
                onChange={(e) => onChangeAgentFastMode(e.target.checked)}
                className="rounded"
              />
              Fast mode (skip marketing + linguist)
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
        <ReviewRow label="Mode" value={flow === "repurpose" ? "Repurpose" : "Create"} />
        <ReviewRow label="Format" value={formatTypeLabel(formatType)} />
        <ReviewRow label="Keyword" value={targetKeyword.trim() || "—"} />
        {flow === "repurpose" ? (
          <ReviewRow label="Source" value={`${sourceContent.trim().length} characters`} />
        ) : null}
        {flow === "create" && title.trim() ? (
          <ReviewRow label="Title" value={title.trim()} />
        ) : null}
        {isLinkedIn && linkedinArchetype ? (
          <ReviewRow
            label="Archetype"
            value={
              LINKEDIN_ARCHETYPES.find((a) => a.id === linkedinArchetype)?.label ??
              linkedinArchetype
            }
          />
        ) : null}
        {isLinkedIn && linkedinHook ? (
          <ReviewRow
            label="Hook"
            value={
              LINKEDIN_HOOK_TYPES.find((h) => h.id === linkedinHook)?.label ?? linkedinHook
            }
          />
        ) : null}
        {flow === "create" && angleHint.trim() ? (
          <ReviewRow label={isLinkedIn ? "Notes" : "Angle"} value={angleHint.trim()} />
        ) : null}
        {flow === "create" && focusCompetitorUrl ? (
          <ReviewRow
            label="Competitors"
            value={
              sessionCompetitorUrls.length > 1
                ? `${focusCompetitorUrl} (primary) · ${sessionCompetitorUrls.length} total`
                : focusCompetitorUrl
            }
          />
        ) : null}
        {flow === "create" ? (
          <ReviewRow label="Destination" value={selectedDestinationLabel ?? "Decide later"} />
        ) : null}
        {flow === "create" ? (
          plannedDate.trim() ? (
            <ReviewRow label="Planned date" value={plannedDate.trim()} />
          ) : (
            <ReviewRow label="Planned date" value="Not scheduled" />
          )
        ) : null}
        {showAgentTeamToggle && flow === "create" ? (
          <ReviewRow
            label="Generation"
            value={
              useAgentTeam ? (agentFastMode ? "Agent team (fast)" : "Agent team") : "Standard"
            }
          />
        ) : null}
      </div>
    </div>
  );
}
