"use client";

/**
 * Thin Next host for shared `StudioView` (parity with Vite StudioPage).
 *
 * Shell owns: hub filters / list+grid cards, empty states, calendar DnD,
 * BrandAiProfileCard (profile prop), AI readiness banner.
 *
 * Kept Next-specific: CreateContentModal (rich create wizard), CMS/publishing
 * context for that modal, cookie-auth loaders, sonner toasts, brief deep-link draft.
 *
 * Local leftovers (do not re-fork hub UI): content-studio-calendar,
 * content-studio-hub-filters, content-studio-list-items, brand-ai-profile-card.
 */

import { useCallback, useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  StudioNewContentButton,
  StudioView,
  type BrandProfileSummary,
  type StudioPiece as ShellStudioPiece,
} from "@workspace/app-shell/studio";
import type { AiProviderId } from "@workspace/ai-providers/config";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import { useBrandProfile } from "@/lib/queries";
import { CreateContentModal, type BriefContentDraft } from "./create-content-modal";
import { loadContentStudioData } from "./content-studio-load-data";
import type { ContentPieceRow, StudioPiece } from "./content-studio-utils";

export { FORMAT_OPTIONS };
export type { ContentPieceRow };

interface Props {
  projectId: string;
  initialBriefDraft?: BriefContentDraft | null;
  initialCreateOpen?: boolean;
}

type StudioLoadState = {
  projectName: string;
  aiReady: boolean | null;
  activeProvider: AiProviderId;
  pieces: StudioPiece[];
  cmsConnections: CmsConnectionSnapshot;
  primaryBlogDestination: string | null;
};

const initialStudioLoadState: StudioLoadState = {
  projectName: "",
  aiReady: null,
  activeProvider: "gemini",
  pieces: [],
  cmsConnections: {},
  primaryBlogDestination: null,
};

function studioLoadReducer(
  state: StudioLoadState,
  action:
    | { type: "load"; payload: StudioLoadState }
    | { type: "setPieces"; updater: (pieces: StudioPiece[]) => StudioPiece[] },
): StudioLoadState {
  if (action.type === "load") return action.payload;
  return { ...state, pieces: action.updater(state.pieces) };
}

function toShellPieces(pieces: StudioPiece[]): ShellStudioPiece[] {
  return pieces.map((piece) => ({
    id: piece.id,
    title: piece.title,
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword,
    status: piece.status,
    wordCount: piece.wordCount,
    plannedDate: piece.plannedDate,
    createdAt: piece.createdAt,
  }));
}

export function ContentStudioClient({
  projectId,
  initialBriefDraft = null,
  initialCreateOpen = false,
}: Props) {
  const [studioData, dispatchStudioData] = useReducer(studioLoadReducer, initialStudioLoadState);
  const {
    projectName,
    aiReady,
    activeProvider,
    pieces,
    cmsConnections,
    primaryBlogDestination,
  } = studioData;
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [briefDraft, setBriefDraft] = useState<BriefContentDraft | null>(initialBriefDraft);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markingReadyId, setMarkingReadyId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);

  const { data: brandProfileRaw, isLoading: brandProfileLoading } = useBrandProfile(projectId);
  const brandProfile = (brandProfileRaw as BrandProfileSummary | null | undefined) ?? null;

  const loadData = useCallback(async () => {
    const data = await loadContentStudioData(projectId);
    dispatchStudioData({
      type: "load",
      payload: {
        projectName: data.projectName,
        aiReady: data.aiReady,
        activeProvider: data.activeProvider,
        pieces: data.pieces,
        cmsConnections: data.cmsConnections,
        primaryBlogDestination: data.primaryBlogDestination,
      },
    });
  }, [projectId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleDelete(pieceId: number) {
    setDeletingId(pieceId);
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    dispatchStudioData({
      type: "setPieces",
      updater: (prev) => prev.filter((p) => p.id !== pieceId),
    });
    toast.success("Deleted");
  }

  async function handleMarkReady(pieceId: number) {
    setMarkingReadyId(pieceId);
    dispatchStudioData({
      type: "setPieces",
      updater: (prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, status: "ready" } : p)),
    });
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    setMarkingReadyId(null);
    if (!res.ok) {
      dispatchStudioData({
        type: "setPieces",
        updater: (prev) =>
          prev.map((p) => (p.id === pieceId ? { ...p, status: "draft" } : p)),
      });
      toast.error("Failed to update status");
    }
  }

  async function handleReschedule(pieceId: number, plannedDate: string | null) {
    setReschedulingId(pieceId);
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plannedDate, status: "ready" }),
    });
    setReschedulingId(null);
    if (!res.ok) {
      toast.error("Failed to reschedule");
      return;
    }
    const updated = (await res.json()) as ContentPieceRow;
    dispatchStudioData({
      type: "setPieces",
      updater: (prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? { ...p, plannedDate: updated.plannedDate, status: updated.status }
            : p,
        ),
    });
  }

  const newContentAction = (
    <StudioNewContentButton
      onClick={() => {
        setBriefDraft(null);
        setCreateOpen(true);
      }}
    />
  );

  return (
    <>
      <StudioView
        projectId={projectId}
        projectName={projectName || null}
        pieces={toShellPieces(pieces)}
        loading={loading}
        brandProfile={brandProfile}
        brandProfileLoading={brandProfileLoading}
        aiReady={aiReady}
        activeProvider={activeProvider}
        aiSettingsHref="/integrations/ai"
        newContentAction={newContentAction}
        onDeletePiece={handleDelete}
        onMarkReady={handleMarkReady}
        onReschedulePiece={handleReschedule}
        deletingId={deletingId}
        markingReadyId={markingReadyId}
        reschedulingId={reschedulingId}
        renderLink={({ href, className, children, title }) => (
          <Link href={href} className={className} title={title}>
            {children}
          </Link>
        )}
      />

      <CreateContentModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setBriefDraft(null);
        }}
        projectId={projectId}
        existingPieces={pieces}
        initialDraft={briefDraft}
        cmsConnections={cmsConnections}
        primaryBlogDestination={primaryBlogDestination}
        onCreated={(piece) => {
          dispatchStudioData({
            type: "setPieces",
            updater: (prev) => [
              { ...piece, source: "studio" },
              ...prev.filter((p) => p.id !== piece.id),
            ],
          });
          setBriefDraft(null);
          void loadData();
        }}
      />
    </>
  );
}
