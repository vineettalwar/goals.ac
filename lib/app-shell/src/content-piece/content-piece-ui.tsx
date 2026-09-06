import { useEffect, useReducer, useState, type ReactNode } from "react";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { ContentPieceFeaturedImage } from "./content-featured-image";
import { StockImagePickerDialog, type StockPickerPhoto } from "./stock-image-picker";
import type { ContentBriefSummary } from "./content-brief-panel";
import type { DualContentScore } from "./content-quality-panel";
import {
  contentPieceCanDelete,
  contentPieceCanEdit,
  contentPieceCanEnhance,
  contentPieceCanGenerate,
  contentPieceCanHumanize,
  contentPieceCanMarkReady,
  contentPieceCanPublish,
  contentPieceCanQueueSocial,
  contentPieceSupportsStockImages,
  formatContentFormatType,
  type ContentPieceDetail,
  type ContentPieceGeneratingState,
  type ContentPiecePublishingState,
} from "./types";
import {
  createEditorState,
  editorReducer,
  pieceDraftKey,
  type ContentPieceSavePayload,
} from "./content-piece-editor-state";
import {
  ContentPieceHeader,
  ContentPieceStatusBanners,
  ContentPieceToolbar,
  HumanizeSnapshotBar,
  PieceLink,
  type ContentPieceLinkProps,
} from "./content-piece-chrome";
import { ContentPieceBodyEditor } from "./content-piece-body-editor";
import { ContentPieceAside } from "./content-piece-aside";

// Re-export public types so index.ts keeps pointing here unchanged.
export type { ContentPieceLinkProps, ContentPieceSavePayload };

export function ContentPieceView({
  piece,
  renderLink,
  onGenerate,
  generating = false,
  generatingState = null,
  generateMessage = null,
  onPublish,
  publishing = false,
  publishingState = null,
  publishMessage = null,
  onSave,
  saving = false,
  saveMessage = null,
  onHumanize,
  humanizing = false,
  humanizeMessage = null,
  onRevertHumanize,
  revertingHumanize = false,
  onDelete,
  deleting = false,
  onMarkReady,
  markingReady = false,
  onCopy,
  onRegenerate,
  regenerating = false,
  regenerateMessage = null,
  onEnhance,
  enhancing = false,
  enhanceMessage = null,
  onRepurpose,
  onQueueSocial,
  queueingSocial = false,
  stockImagesConfigured = false,
  onRegenerateImages,
  regeneratingImages = false,
  onAttachFeaturedImageUrl,
  attachingFeaturedImageUrl = false,
  onSearchStockImages,
  onAttachStockPhoto,
  attachingStockPhoto = false,
  staleGenerating = false,
  onResetGeneration,
  fetchDualScore,
  fetchBrief,
  headerExtra,
  asideExtra,
  destinationHealthOk = null,
  onSaveCmsRemoteId,
}: {
  piece: ContentPieceDetail;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  fetchDualScore?: (contentPieceId: number) => Promise<DualContentScore | null>;
  fetchBrief?: (briefId: number) => Promise<ContentBriefSummary | null>;
  onGenerate?: () => void | Promise<void>;
  generating?: boolean;
  generatingState?: ContentPieceGeneratingState | null;
  generateMessage?: string | null;
  onPublish?: () => void;
  publishing?: boolean;
  publishingState?: ContentPiecePublishingState | null;
  publishMessage?: string | null;
  onSave?: (payload: ContentPieceSavePayload) => void | Promise<void>;
  saving?: boolean;
  saveMessage?: string | null;
  onHumanize?: () => void;
  humanizing?: boolean;
  humanizeMessage?: string | null;
  onRevertHumanize?: () => void | Promise<void>;
  revertingHumanize?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onMarkReady?: () => void | Promise<void>;
  markingReady?: boolean;
  onCopy?: () => void | Promise<void>;
  onRegenerate?: () => void | Promise<void>;
  regenerating?: boolean;
  regenerateMessage?: string | null;
  /** Called with the coverage checklist's missing terms when triggered from the quality panel's "Fix gaps" button. */
  onEnhance?: (missingTerms?: string[]) => void | Promise<void>;
  enhancing?: boolean;
  enhanceMessage?: string | null;
  onRepurpose?: () => void;
  onQueueSocial?: () => void;
  queueingSocial?: boolean;
  stockImagesConfigured?: boolean;
  onRegenerateImages?: () => void | Promise<void>;
  regeneratingImages?: boolean;
  onAttachFeaturedImageUrl?: (url: string) => void | Promise<void>;
  attachingFeaturedImageUrl?: boolean;
  onSearchStockImages?: (query: string) => Promise<StockPickerPhoto[]>;
  onAttachStockPhoto?: (payload: {
    role: "featured" | "inline";
    photo: StockPickerPhoto;
    sectionHeading?: string;
    searchQuery?: string;
    /** Current editor body when editing — attach into draft, not stale saved body. */
    bodyMarkdown?: string;
  }) => void | Promise<ContentPieceDetail | void>;
  attachingStockPhoto?: boolean;
  staleGenerating?: boolean;
  onResetGeneration?: () => void | Promise<void>;
  /** Host-specific header extras (e.g. performance badge). */
  headerExtra?: ReactNode;
  /** Host-specific aside extras (e.g. visual summary card). */
  asideExtra?: ReactNode;
  /** Primary CMS destination lastHealthOk; null = unknown (does not soft-block). */
  destinationHealthOk?: boolean | null;
  /** Persist WordPress remote id for refresh-piece update-in-place. */
  onSaveCmsRemoteId?: (cmsRemoteId: string | null) => void | Promise<void>;
}) {
  const [editor, dispatch] = useReducer(editorReducer, piece, createEditorState);
  const [stockPickerRole, setStockPickerRole] = useState<"featured" | "inline" | null>(null);
  const [stockPhotos, setStockPhotos] = useState<StockPickerPhoto[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockSearching, setStockSearching] = useState(false);
  const [stockPickerError, setStockPickerError] = useState<string | null>(null);

  const nextDraftKey = pieceDraftKey(piece);
  if (!editor.editing && editor.draftKey !== nextDraftKey) {
    dispatch({ type: "sync", piece });
  }

  const [snapshotView, setSnapshotView] = useState<"after" | "before">("after");
  const preHumanizeBody = piece.pieceMetadata?.preHumanizeBodyMarkdown ?? null;
  const hasHumanizeSnapshot = Boolean(
    preHumanizeBody?.trim() &&
      preHumanizeBody !== (piece.bodyMarkdown ?? "") &&
      contentPieceCanEdit(piece.status),
  );
  useEffect(() => {
    if (!hasHumanizeSnapshot || editor.editing) setSnapshotView("after");
  }, [hasHumanizeSnapshot, editor.editing, piece.id]);

  const formatLabel = formatContentFormatType(piece.formatType);
  const displayBody = editor.editing ? editor.bodyDraft : (piece.bodyMarkdown ?? "");
  const body = displayBody.trim();
  // Empty draft → Generate; body present → Regenerate (never both).
  const showGenerate =
    !body && contentPieceCanGenerate(piece.status) && Boolean(onGenerate);
  const showPublish = Boolean(contentPieceCanPublish(piece.status) && onPublish);
  const showEdit = Boolean(contentPieceCanEdit(piece.status) && onSave);
  const showHumanize =
    contentPieceCanHumanize(piece.formatType) &&
    Boolean(body) &&
    contentPieceCanEdit(piece.status) &&
    Boolean(onHumanize);
  const showRegenerate = Boolean(
    body && contentPieceCanEdit(piece.status) && onRegenerate,
  );
  const showEnhance = Boolean(
    body &&
      contentPieceCanEnhance(piece.formatType) &&
      contentPieceCanEdit(piece.status) &&
      onEnhance,
  );
  const showRepurpose = Boolean(body && onRepurpose);
  const showQueueSocial = Boolean(
    onQueueSocial &&
      contentPieceCanQueueSocial(piece.formatType, piece.status, piece.bodyMarkdown ?? body),
  );
  const featuredImage =
    piece.pieceMetadata?.images?.find((image) => image.role === "featured") ?? null;
  const featuredImageUrl = piece.pieceMetadata?.featuredImageUrl ?? null;
  const supportsStockImages = contentPieceSupportsStockImages(piece.formatType);
  const showMarkReady = Boolean(
    contentPieceCanMarkReady(piece.status, piece.bodyMarkdown) && onMarkReady,
  );
  const showDelete = Boolean(contentPieceCanDelete(piece.status) && onDelete);
  const actionMessage =
    generateMessage ??
    publishMessage ??
    saveMessage ??
    humanizeMessage ??
    regenerateMessage ??
    enhanceMessage;
  const generateError =
    generateMessage != null &&
    !generating &&
    !generatingState &&
    (piece.status === "failed" || staleGenerating);
  const busy =
    generating ||
    publishing ||
    saving ||
    humanizing ||
    revertingHumanize ||
    deleting ||
    markingReady ||
    regenerating ||
    enhancing ||
    regeneratingImages ||
    attachingFeaturedImageUrl ||
    attachingStockPhoto ||
    queueingSocial;
  const wordCount = (editor.editing ? editor.bodyDraft : (piece.bodyMarkdown ?? ""))
    .split(/\s+/)
    .filter(Boolean).length;
  const sectionHeadings = (editor.editing ? editor.bodyDraft : (piece.bodyMarkdown ?? ""))
    .match(/^## (.+)$/gm)
    ?.map((line) => line.replace(/^## /, "").trim())
    .filter(Boolean) ?? [];
  const defaultStockQuery =
    piece.targetKeyword?.trim() || piece.title?.trim() || stockSearchQuery || "blog";
  const canBrowseStock =
    Boolean(stockImagesConfigured && onSearchStockImages && onAttachStockPhoto) &&
    supportsStockImages;

  async function handleStockSearch(query: string) {
    if (!onSearchStockImages) return;
    setStockSearching(true);
    setStockPickerError(null);
    setStockSearchQuery(query);
    try {
      const photos = await onSearchStockImages(query);
      setStockPhotos(photos);
    } catch (err) {
      setStockPhotos([]);
      setStockPickerError(err instanceof Error ? err.message : "Stock search failed");
    } finally {
      setStockSearching(false);
    }
  }

  async function openStockPicker(role: "featured" | "inline") {
    setStockPickerRole(role);
    setStockPickerError(null);
    if (stockPhotos.length === 0) {
      await handleStockSearch(defaultStockQuery);
    }
  }

  async function handleSave() {
    if (!onSave) return;
    // Published pieces cannot enter edit mode; status is draft|ready only.
    await onSave({
      title: editor.titleDraft.trim(),
      bodyMarkdown: editor.bodyDraft,
      status: editor.statusDraft,
      plannedDate: editor.plannedDateDraft.trim() || null,
    });
    dispatch({ type: "saved", piece });
  }

  async function handleCopy() {
    if (onCopy) {
      await onCopy();
    } else if (body) {
      await navigator.clipboard.writeText(body);
    }
    dispatch({ type: "copied" });
    window.setTimeout(() => dispatch({ type: "clear_copied" }), 2000);
  }

  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-6`}>
      <ContentPieceHeader
        piece={piece}
        editing={editor.editing}
        titleDraft={editor.titleDraft}
        formatLabel={formatLabel}
        wordCount={wordCount}
        onTitleChange={(value) => dispatch({ type: "set_title", value })}
        renderLink={renderLink}
        headerExtra={headerExtra}
      />

      <ContentPieceStatusBanners
        actionMessage={actionMessage}
        generateError={generateError}
        generateMessage={generateMessage}
        piece={piece}
        generating={generating}
        generatingState={generatingState}
        staleGenerating={staleGenerating}
        onResetGeneration={onResetGeneration}
        publishingState={publishingState}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <ContentPieceFeaturedImage
            featuredImage={featuredImage}
            featuredImageUrl={featuredImageUrl}
            supportsStockImages={supportsStockImages}
            stockImagesConfigured={stockImagesConfigured}
            regenerating={regeneratingImages}
            attachingUrl={attachingFeaturedImageUrl || attachingStockPhoto}
            onRegenerateImages={onRegenerateImages}
            onAttachFeaturedImageUrl={onAttachFeaturedImageUrl}
            onBrowseStockImages={
              canBrowseStock ? () => void openStockPicker("featured") : undefined
            }
          />
          <div className="paper-card overflow-hidden rounded-xl">
            <ContentPieceToolbar
              pieceTitle={piece.title}
              editing={editor.editing}
              previewMode={editor.previewMode}
              copied={editor.copied}
              busy={busy}
              titleDraft={editor.titleDraft}
              saving={saving}
              regenerating={regenerating}
              enhancing={enhancing}
              humanizing={humanizing}
              generating={generating}
              deleting={deleting}
              markingReady={markingReady}
              body={body}
              onTogglePreview={showEdit ? () => dispatch({ type: "toggle_preview" }) : undefined}
              onSave={showEdit ? () => void handleSave() : undefined}
              onCancel={showEdit ? () => dispatch({ type: "cancel", piece }) : undefined}
              onStartEdit={showEdit ? () => dispatch({ type: "start_edit" }) : undefined}
              onRepurpose={showRepurpose ? onRepurpose : undefined}
              onQueueSocial={showQueueSocial ? onQueueSocial : undefined}
              queueingSocial={queueingSocial}
              onCopy={() => void handleCopy()}
              onRegenerate={showRegenerate ? onRegenerate : undefined}
              onEnhance={showEnhance ? onEnhance : undefined}
              onHumanize={showHumanize ? onHumanize : undefined}
              onMarkReady={showMarkReady ? onMarkReady : undefined}
              onGenerate={showGenerate ? onGenerate : undefined}
              onDelete={showDelete ? onDelete : undefined}
              onInsertInlineImage={
                canBrowseStock && Boolean(body)
                  ? () => void openStockPicker("inline")
                  : undefined
              }
            />
            {hasHumanizeSnapshot && !editor.editing ? (
              <HumanizeSnapshotBar
                view={snapshotView}
                onViewChange={setSnapshotView}
                onRevert={() => {
                  if (
                    onRevertHumanize &&
                    window.confirm(
                      "Revert to the body from before the last humanize pass? This replaces the current content.",
                    )
                  ) {
                    void onRevertHumanize();
                  }
                }}
                reverting={revertingHumanize}
                disabled={busy || !onRevertHumanize}
              />
            ) : null}
            <ContentPieceBodyEditor
              editing={editor.editing}
              previewMode={editor.previewMode}
              canEdit={showEdit}
              bodyDraft={editor.bodyDraft}
              displayBody={displayBody}
              body={body}
              formatType={piece.formatType}
              onBodyChange={(value) => dispatch({ type: "set_body", value })}
              previewOverrideBody={
                snapshotView === "before" && hasHumanizeSnapshot
                  ? preHumanizeBody ?? undefined
                  : undefined
              }
            />
          </div>
        </div>

        <ContentPieceAside
          editing={editor.editing}
          statusDraft={editor.statusDraft}
          plannedDateDraft={editor.plannedDateDraft}
          piece={piece}
          displayBody={displayBody}
          wordCount={wordCount}
          canEnhance={showEnhance}
          enhancing={enhancing}
          canPublish={showPublish}
          busy={busy}
          fetchDualScore={fetchDualScore}
          fetchBrief={fetchBrief}
          renderLink={renderLink}
          onStatusChange={(value) => dispatch({ type: "set_status", value })}
          onPlannedDateChange={(value) => dispatch({ type: "set_planned_date", value })}
          onEnhance={onEnhance}
          onPublish={onPublish}
          onQueueSocial={showQueueSocial ? onQueueSocial : undefined}
          queueingSocial={queueingSocial}
          onInsertOutline={
            editor.editing
              ? (markdown) => dispatch({ type: "set_body", value: markdown })
              : undefined
          }
          asideExtra={asideExtra}
          destinationHealthOk={destinationHealthOk}
          onSaveCmsRemoteId={onSaveCmsRemoteId}
        />
      </div>

      {stockPickerRole && canBrowseStock ? (
        <StockImagePickerDialog
          open
          role={stockPickerRole}
          initialQuery={stockSearchQuery || defaultStockQuery}
          sectionHeadings={sectionHeadings}
          searching={stockSearching}
          attaching={attachingStockPhoto}
          photos={stockPhotos}
          error={stockPickerError}
          onClose={() => {
            if (attachingStockPhoto) return;
            setStockPickerRole(null);
            setStockPickerError(null);
          }}
          onSearch={handleStockSearch}
          onSelect={async (photo, sectionHeading) => {
            if (!onAttachStockPhoto || !stockPickerRole) return;
            setStockPickerError(null);
            try {
              const updated = await onAttachStockPhoto({
                role: stockPickerRole,
                photo,
                sectionHeading,
                searchQuery: stockSearchQuery || defaultStockQuery,
                bodyMarkdown: editor.editing ? editor.bodyDraft : undefined,
              });
              if (updated) {
                dispatch({ type: "apply_remote", piece: updated });
              }
              setStockPickerRole(null);
            } catch (err) {
              setStockPickerError(err instanceof Error ? err.message : "Could not attach image");
            }
          }}
        />
      ) : null}
    </div>
  );
}

export function ContentPieceNotFound({
  renderLink,
}: {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <h2 className="mb-2 text-xl font-semibold">Content piece not found</h2>
      <p className="mb-6 text-muted-foreground">
        This piece doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <PieceLink
        renderLink={renderLink}
        href="/projects"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Content studio
      </PieceLink>
    </div>
  );
}
