import { CheckCircle2, FileText, Loader2, RefreshCw } from "lucide-react";
import type { PublishDestinationDefinition } from "../content-piece/publish-destinations";
import {
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./linkedin-archetypes";
import type { StudioFormatOption } from "./types";
import {
  type CreateFlow,
  type CreateSourcePieceOption,
  GENERATING_LABELS,
  MIN_REPURPOSE_CHARS,
} from "./create-content-types";

// ---------------------------------------------------------------------------
// Generating overlay
// ---------------------------------------------------------------------------

export function GeneratingView({
  generatingLabelIndex,
  generatingHeadings,
}: {
  generatingLabelIndex: number;
  generatingHeadings?: string[] | null;
}) {
  return (
    <div className="mt-8 space-y-3" aria-live="polite" aria-busy="true">
      {GENERATING_LABELS.map((label, index) => {
        const done = index < generatingLabelIndex;
        const active = index === generatingLabelIndex;
        return (
          <div
            key={label}
            className={
              active
                ? "flex items-center gap-3 text-sm font-medium text-foreground"
                : done
                  ? "flex items-center gap-3 text-sm text-muted-foreground"
                  : "flex items-center gap-3 text-sm text-muted-foreground/50"
            }
          >
            {active ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
            )}
            {label}
          </div>
        );
      })}
      {generatingHeadings && generatingHeadings.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
          {generatingHeadings.map((section, index) => {
            const isLast = index === generatingHeadings.length - 1;
            return (
              <li
                key={`${index}-${section}`}
                className={
                  isLast
                    ? "flex items-center gap-3 text-sm font-medium text-foreground"
                    : "flex items-center gap-3 text-sm text-muted-foreground"
                }
              >
                {isLast && generatingLabelIndex === 1 ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                )}
                {section}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Path step — Create new vs Repurpose existing
// ---------------------------------------------------------------------------

export function PathStep({
  flow,
  onSelectCreate,
  onSelectRepurpose,
}: {
  flow: CreateFlow;
  onSelectCreate: () => void;
  onSelectRepurpose: () => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={onSelectCreate}
        className={
          flow === "create"
            ? "flex w-full items-start gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left"
            : "flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/60 hover:bg-secondary/40"
        }
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="block text-sm font-medium">Create new</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Generate from a keyword and optional competitor focus.
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onSelectRepurpose}
        className={
          flow === "repurpose"
            ? "flex w-full items-start gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left"
            : "flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/60 hover:bg-secondary/40"
        }
      >
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="block text-sm font-medium">Repurpose existing</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Adapt a studio piece or pasted draft into another format.
          </span>
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format step
// ---------------------------------------------------------------------------

export function FormatStep({
  formatType,
  formatOptions,
  onSelect,
}: {
  formatType: string;
  formatOptions: readonly StudioFormatOption[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-4 max-h-[min(42vh,300px)] space-y-2 overflow-y-auto pr-1">
      {formatOptions.map((option) => {
        const selected = formatType === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={
              selected
                ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
                : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
            }
          >
            <span className="font-medium">{option.label}</span>
            {selected ? <span className="text-xs text-primary">Selected</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyword step
// ---------------------------------------------------------------------------

export function KeywordStep({
  flow,
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
}: {
  flow: CreateFlow;
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
}) {
  return (
    <div className="mt-4 space-y-3.5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Target keyword</span>
        <input
          type="text"
          autoFocus
          required
          value={targetKeyword}
          onChange={(event) => onChangeKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEnterNext();
            }
          }}
          placeholder="e.g. saas seo strategy"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
        />
      </label>

      {isLinkedIn ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">
            Archetype{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {LINKEDIN_ARCHETYPES.map((archetype) => {
              const selected = linkedinArchetype === archetype.id;
              return (
                <button
                  key={archetype.id}
                  type="button"
                  title={archetype.description}
                  onClick={() => onChangeArchetype(selected ? "" : archetype.id)}
                  className={
                    selected
                      ? "rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-left text-sm font-medium text-foreground"
                      : "rounded-lg border border-border px-3 py-1.5 text-left text-sm text-muted-foreground hover:border-primary/60 hover:bg-secondary/40 hover:text-foreground"
                  }
                >
                  {archetype.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isLinkedIn ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">
            Hook type{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {LINKEDIN_HOOK_TYPES.map((hook) => {
              const selected = linkedinHook === hook.id;
              return (
                <button
                  key={hook.id}
                  type="button"
                  title={hook.template}
                  onClick={() => onChangeHook(selected ? "" : hook.id)}
                  className={
                    selected
                      ? "rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-left text-sm font-medium text-foreground"
                      : "rounded-lg border border-border px-3 py-1.5 text-left text-sm text-muted-foreground hover:border-primary/60 hover:bg-secondary/40 hover:text-foreground"
                  }
                >
                  {hook.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {flow === "create" ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              {isLinkedIn ? "Extra notes" : "Angle / hint"}{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <textarea
              rows={2}
              value={angleHint}
              onChange={(event) => onChangeAngleHint(event.target.value)}
              placeholder={
                isLinkedIn
                  ? "Optional context beyond archetype and hook…"
                  : "Tone, audience, or angle…"
              }
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              Title <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => onChangeTitle(event.target.value)}
              placeholder="e.g. How to improve SEO for SaaS"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source step (repurpose)
// ---------------------------------------------------------------------------

export function SourceStep({
  existingPieces,
  sourcePieceId,
  onSelectPiece,
  loadingSourcePiece,
  sourceContent,
  onChangeSourceContent,
}: {
  existingPieces?: CreateSourcePieceOption[] | null;
  sourcePieceId: string;
  onSelectPiece: (id: string) => void;
  loadingSourcePiece: boolean;
  sourceContent: string;
  onChangeSourceContent: (value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3.5">
      {(existingPieces?.length ?? 0) > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Studio piece</span>
          <select
            value={sourcePieceId}
            onChange={(event) => onSelectPiece(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="">Paste below instead…</option>
            {existingPieces!.map((piece) => (
              <option key={piece.id} value={String(piece.id)}>
                {piece.title || `Piece #${piece.id}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {loadingSourcePiece ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading piece…
        </div>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Source text</span>
        <textarea
          autoFocus
          rows={8}
          value={sourceContent}
          onChange={(event) => onChangeSourceContent(event.target.value)}
          placeholder="Paste the draft to adapt…"
          className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {sourceContent.trim().length} / {MIN_REPURPOSE_CHARS} characters minimum
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Destination step
// ---------------------------------------------------------------------------

export function DestinationStep({
  destinations,
  intendedPublishPlatform,
  onSelect,
}: {
  destinations: PublishDestinationDefinition[];
  intendedPublishPlatform: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={
          !intendedPublishPlatform
            ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
            : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
        }
      >
        <span className="font-medium">Decide later</span>
        {!intendedPublishPlatform ? <span className="text-xs text-primary">Selected</span> : null}
      </button>
      {destinations.map((destination) => {
        const selected = intendedPublishPlatform === destination.id;
        return (
          <button
            key={destination.id}
            type="button"
            onClick={() => onSelect(destination.id)}
            className={
              selected
                ? "flex w-full flex-col items-start rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
                : "flex w-full flex-col items-start rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
            }
          >
            <span className="flex w-full items-center justify-between gap-2 font-medium">
              {destination.label}
              {selected ? <span className="text-xs text-primary">Selected</span> : null}
            </span>
            {destination.description ? (
              <span className="mt-0.5 text-xs text-muted-foreground">
                {destination.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
