import type { PublishDestinationDefinition } from "../content-piece/publish-destinations";
import { AgentTeamProgress, type AgentTeamState } from "./agent-team-progress";
import { CompetitorsStep } from "./create-content-competitors-step";
import { ReviewStep } from "./create-content-review";
import {
  DestinationStep,
  FormatStep,
  GeneratingView,
  KeywordStep,
  PathStep,
  SourceStep,
} from "./create-content-steps";
import type {
  CreateCompetitorOption,
  CreateFlow,
  CreateSourcePieceOption,
  CreateStepId,
} from "./create-content-types";
import type { LinkedInArchetypeId, LinkedInHookId } from "./linkedin-archetypes";
import type { StudioFormatOption } from "./types";

export function CreateContentDialogSteps({
  showGenerating,
  currentStep,
  generatingLabelIndex,
  generatingHeadings,
  useAgentTeam,
  agentTeamState,
  agentTeamRunning,
  agentTeamElapsedMs,
  submitting,
  flow,
  onSelectCreate,
  onSelectRepurpose,
  formatType,
  formatOptions,
  onFormatSelect,
  isLinkedIn,
  targetKeyword,
  onChangeKeyword,
  onEnterNext,
  angleHint,
  onChangeAngleHint,
  title,
  onChangeTitle,
  linkedinArchetype,
  onChangeArchetype,
  linkedinHook,
  onChangeHook,
  existingPieces,
  sourcePieceId,
  onSelectSourcePiece,
  loadingSourcePiece,
  sourceContent,
  onChangeSourceContent,
  competitorsLoading,
  sessionCompetitorUrls,
  focusCompetitorUrl,
  competitorMeta,
  onToggleFocus,
  newCompetitorUrl,
  onChangeNewUrl,
  onAddCompetitor,
  onUpdateCompetitor,
  onRemoveCompetitor,
  destinations,
  intendedPublishPlatform,
  onSelectDestination,
  selectedDestinationLabel,
  plannedDate,
  onChangePlannedDate,
  onChangeUseAgentTeam,
  agentFastMode,
  onChangeAgentFastMode,
  showAgentTeamToggle,
  error,
}: {
  showGenerating: boolean;
  currentStep: CreateStepId;
  generatingLabelIndex: number;
  generatingHeadings?: string[] | null;
  useAgentTeam: boolean;
  agentTeamState?: AgentTeamState | null;
  agentTeamRunning?: boolean;
  agentTeamElapsedMs?: number;
  submitting?: boolean;
  flow: CreateFlow;
  onSelectCreate: () => void;
  onSelectRepurpose: () => void;
  formatType: string;
  formatOptions: readonly StudioFormatOption[];
  onFormatSelect: (value: string) => void;
  isLinkedIn: boolean;
  targetKeyword: string;
  onChangeKeyword: (value: string) => void;
  onEnterNext: () => void;
  angleHint: string;
  onChangeAngleHint: (value: string) => void;
  title: string;
  onChangeTitle: (value: string) => void;
  linkedinArchetype: LinkedInArchetypeId | "";
  onChangeArchetype: (value: LinkedInArchetypeId | "") => void;
  linkedinHook: LinkedInHookId | "";
  onChangeHook: (value: LinkedInHookId | "") => void;
  existingPieces?: CreateSourcePieceOption[] | null;
  sourcePieceId: string;
  onSelectSourcePiece: (id: string) => void;
  loadingSourcePiece: boolean;
  sourceContent: string;
  onChangeSourceContent: (value: string) => void;
  competitorsLoading?: boolean;
  sessionCompetitorUrls: string[];
  focusCompetitorUrl: string;
  competitorMeta: Map<string, CreateCompetitorOption>;
  onToggleFocus: (url: string) => void;
  newCompetitorUrl: string;
  onChangeNewUrl: (value: string) => void;
  onAddCompetitor: () => void;
  onUpdateCompetitor: (oldUrl: string, nextRaw: string) => boolean;
  onRemoveCompetitor: (url: string) => void;
  destinations: PublishDestinationDefinition[];
  intendedPublishPlatform: string | undefined;
  onSelectDestination: (id: string | undefined) => void;
  selectedDestinationLabel: string | null;
  plannedDate: string;
  onChangePlannedDate: (value: string) => void;
  onChangeUseAgentTeam: (value: boolean) => void;
  agentFastMode: boolean;
  onChangeAgentFastMode: (value: boolean) => void;
  showAgentTeamToggle: boolean;
  error?: string | null;
}) {
  return (
    <>
      {showGenerating ? (
        <GeneratingView
          generatingLabelIndex={generatingLabelIndex}
          generatingHeadings={generatingHeadings}
          agentTeamSlot={
            useAgentTeam && agentTeamState ? (
              <AgentTeamProgress
                agentState={agentTeamState}
                isRunning={Boolean(agentTeamRunning || submitting)}
                totalElapsedMs={agentTeamElapsedMs}
              />
            ) : undefined
          }
        />
      ) : null}

      {!showGenerating && currentStep === "path" ? (
        <PathStep
          flow={flow}
          onSelectCreate={onSelectCreate}
          onSelectRepurpose={onSelectRepurpose}
        />
      ) : null}

      {!showGenerating && currentStep === "format" ? (
        <FormatStep
          formatType={formatType}
          formatOptions={formatOptions}
          onSelect={onFormatSelect}
        />
      ) : null}

      {!showGenerating && currentStep === "keyword" ? (
        <KeywordStep
          flow={flow}
          isLinkedIn={isLinkedIn}
          targetKeyword={targetKeyword}
          onChangeKeyword={onChangeKeyword}
          onEnterNext={onEnterNext}
          angleHint={angleHint}
          onChangeAngleHint={onChangeAngleHint}
          title={title}
          onChangeTitle={onChangeTitle}
          linkedinArchetype={linkedinArchetype}
          onChangeArchetype={onChangeArchetype}
          linkedinHook={linkedinHook}
          onChangeHook={onChangeHook}
        />
      ) : null}

      {!showGenerating && currentStep === "source" ? (
        <SourceStep
          existingPieces={existingPieces}
          sourcePieceId={sourcePieceId}
          onSelectPiece={onSelectSourcePiece}
          loadingSourcePiece={loadingSourcePiece}
          sourceContent={sourceContent}
          onChangeSourceContent={onChangeSourceContent}
        />
      ) : null}

      {!showGenerating && currentStep === "competitors" ? (
        <CompetitorsStep
          competitorsLoading={competitorsLoading ?? false}
          sessionCompetitorUrls={sessionCompetitorUrls}
          focusCompetitorUrl={focusCompetitorUrl}
          competitorMeta={competitorMeta}
          onToggleFocus={onToggleFocus}
          newCompetitorUrl={newCompetitorUrl}
          onChangeNewUrl={onChangeNewUrl}
          onAddCompetitor={onAddCompetitor}
          onUpdateCompetitor={onUpdateCompetitor}
          onRemoveCompetitor={onRemoveCompetitor}
        />
      ) : null}

      {!showGenerating && currentStep === "destination" ? (
        <DestinationStep
          destinations={destinations}
          intendedPublishPlatform={intendedPublishPlatform}
          onSelect={onSelectDestination}
        />
      ) : null}

      {!showGenerating && currentStep === "review" ? (
        <ReviewStep
          flow={flow}
          formatType={formatType}
          targetKeyword={targetKeyword}
          title={title}
          isLinkedIn={isLinkedIn}
          linkedinArchetype={linkedinArchetype}
          linkedinHook={linkedinHook}
          angleHint={angleHint}
          sourceContent={sourceContent}
          sessionCompetitorUrls={sessionCompetitorUrls}
          focusCompetitorUrl={focusCompetitorUrl}
          selectedDestinationLabel={selectedDestinationLabel}
          plannedDate={plannedDate}
          onChangePlannedDate={onChangePlannedDate}
          showAgentTeamToggle={showAgentTeamToggle}
          useAgentTeam={useAgentTeam}
          onChangeUseAgentTeam={onChangeUseAgentTeam}
          agentFastMode={agentFastMode}
          onChangeAgentFastMode={onChangeAgentFastMode}
        />
      ) : null}

      {error && !submitting ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : null}
    </>
  );
}
