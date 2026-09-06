"use client";

/**
 * Thin Next host for shared `StudioView` (parity with Vite StudioPage).
 *
 * Shell owns: hub filters / list+grid cards, empty states, calendar DnD,
 * BrandAiProfileCard (profile prop), AI readiness banner.
 *
 * Kept Next-specific: CreateContentModal (rich create wizard), CMS/publishing
 * context for that modal, cookie-auth loaders, sonner toasts, brief deep-link draft,
 * ArticlePerformanceBadge via `renderPieceExtras`, voice-required gate.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { ArticlePerformanceBadge } from "./article-performance-badge";
import { CreateContentModal, type BriefContentDraft } from "./create-content-modal";
import { loadContentStudioData } from "./content-studio-load-data";
import type { ContentPieceRow, StudioPiece } from "./content-studio-utils";
import { isRefreshPiece } from "./content-studio-utils";
import { VoiceRequiredBanner, type VoiceGateStatus } from "./voice-required-banner";

export { FORMAT_OPTIONS };
export type { ContentPieceRow };

interface Props {
  projectId: string;
  initialBriefDraft?: BriefContentDraft | null;
  initialCreateOpen?: boolean;
  initialOptimize?: { url: string; keyword: string } | null;
}

type StudioLoadState = {
  projectName: string;
  aiReady: boolean | null;
  activeProvider: AiProviderId;
  orgBedrockModel: string | null;
  pieces: StudioPiece[];
  cmsConnections: CmsConnectionSnapshot;
  primaryBlogDestination: string | null;
  brandProfile: BrandProfileSummary | null;
  voiceGate: VoiceGateStatus;
};

const emptyVoiceGate: VoiceGateStatus = {
  voiceReady: false,
  voiceBuilding: false,
  hasBrandVoice: false,
  hasPlatformVoice: false,
  scrapeStatus: null,
};

const initialStudioLoadState: StudioLoadState = {
  projectName: "",
  aiReady: null,
  activeProvider: "gemini",
  orgBedrockModel: null,
  pieces: [],
  cmsConnections: {},
  primaryBlogDestination: null,
  brandProfile: null,
  voiceGate: emptyVoiceGate,
};

function studioLoadReducer(
  state: StudioLoadState,
  action:
    | { type: "load"; payload: StudioLoadState }
    | { type: "setPieces"; updater: (pieces: StudioPiece[]) => StudioPiece[] }
    | { type: "setVoiceGate"; voiceGate: VoiceGateStatus },
): StudioLoadState {
  if (action.type === "load") return action.payload;
  if (action.type === "setVoiceGate") return { ...state, voiceGate: action.voiceGate };
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
    publishedUrl: piece.publishedUrl,
    createdAt: piece.createdAt,
    isRefresh: piece.isRefresh,
  }));
}

export function ContentStudioClient({
  projectId,
  initialBriefDraft = null,
  initialCreateOpen = false,
  initialOptimize = null,
}: Props) {
  const [studioData, dispatchStudioData] = useReducer(studioLoadReducer, initialStudioLoadState);
  const {
    projectName,
    aiReady,
    activeProvider,
    orgBedrockModel,
    pieces,
    cmsConnections,
    primaryBlogDestination,
    brandProfile,
    voiceGate,
  } = studioData;
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [briefDraft, setBriefDraft] = useState<BriefContentDraft | null>(initialBriefDraft);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markingReadyId, setMarkingReadyId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const prevScrapeRef = useRef(voiceGate.scrapeStatus);

  const loadData = useCallback(async () => {
    const data = await loadContentStudioData(projectId);
    dispatchStudioData({
      type: "load",
      payload: {
        projectName: data.projectName,
        aiReady: data.aiReady,
        activeProvider: data.activeProvider,
        orgBedrockModel: data.orgBedrockModel,
        pieces: data.pieces,
        cmsConnections: data.cmsConnections,
        primaryBlogDestination: data.primaryBlogDestination,
        brandProfile: data.brandProfile,
        voiceGate: data.voiceGate,
      },
    });
  }, [projectId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const scrapePending = voiceGate.voiceBuilding || voiceGate.scrapeStatus === "pending";
  const { data: polledBrand } = useQuery({
    queryKey: ["content-studio-voice-poll", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/website-projects/${projectId}/brand-profile`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: scrapePending,
    refetchInterval: scrapePending ? 3000 : false,
  });

  useEffect(() => {
    if (!polledBrand) return;
    const nextStatus =
      typeof polledBrand.scrapeStatus === "string" ? polledBrand.scrapeStatus : null;
    const prev = prevScrapeRef.current;
    prevScrapeRef.current = nextStatus;
    dispatchStudioData({
      type: "setVoiceGate",
      voiceGate: {
        voiceReady: Boolean(polledBrand.voiceReady),
        voiceBuilding: Boolean(polledBrand.voiceBuilding),
        hasBrandVoice: Boolean(polledBrand.hasBrandVoice),
        hasPlatformVoice: Boolean(polledBrand.hasPlatformVoice),
        scrapeStatus: nextStatus,
      },
    });
    if (prev === "pending" && nextStatus === "done" && polledBrand.voiceReady) {
      toast.success("Brand voice ready");
      void loadData();
    }
  }, [polledBrand, loadData]);

  async function handleRescan() {
    setRescanning(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to start website rescan");
        return;
      }
      dispatchStudioData({
        type: "setVoiceGate",
        voiceGate: {
          ...voiceGate,
          voiceBuilding: true,
          scrapeStatus: "pending",
          voiceReady: false,
        },
      });
      toast.message("Rescanning…");
    } finally {
      setRescanning(false);
    }
  }

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

  const voiceReady = voiceGate.voiceReady;
  const newContentAction = (
    <div className="flex flex-wrap items-center gap-3">
      <StudioNewContentButton
        onClick={() => {
          if (!voiceReady) {
            toast.error("Add a brand voice first");
            return;
          }
          setBriefDraft(null);
          setCreateOpen(true);
        }}
      />
      <Link
        href={`/projects/${projectId}/daily-five`}
        className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
      >
        Daily Five
      </Link>
    </div>
  );

  const suggestedSections = ["News", "Features", "Opinion", "Funding", "How-to"];

  return (
    <>
      <VoiceRequiredBanner
        projectId={projectId}
        status={voiceGate}
        onRescan={handleRescan}
        rescanning={rescanning}
      />
      <StudioView
        projectId={projectId}
        projectName={projectName || null}
        pieces={toShellPieces(pieces)}
        loading={loading}
        brandProfile={brandProfile}
        brandProfileLoading={loading && !brandProfile}
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
        renderPieceExtras={(piece) => (
          <ArticlePerformanceBadge
            projectId={projectId}
            contentPieceId={piece.id}
            publishedUrl={piece.publishedUrl}
          />
        )}
      />

      <CreateContentModal
        open={createOpen && voiceReady}
        onClose={() => {
          setCreateOpen(false);
          setBriefDraft(null);
        }}
        projectId={projectId}
        existingPieces={pieces}
        initialDraft={briefDraft}
        initialOptimize={initialOptimize}
        cmsConnections={cmsConnections}
        primaryBlogDestination={primaryBlogDestination}
        activeProvider={activeProvider}
        orgBedrockModel={orgBedrockModel}
        onCreated={(piece) => {
          dispatchStudioData({
            type: "setPieces",
            updater: (prev) => [
              {
                ...piece,
                source: "studio",
                isRefresh: isRefreshPiece(piece),
              },
              ...prev.filter((p) => p.id !== piece.id),
            ],
          });
          setBriefDraft(null);
          void loadData();
        }}
        onVoiceRequired={() => {
          setCreateOpen(false);
          toast.error("Add a brand voice first");
          void loadData();
        }}
        suggestedSections={suggestedSections}
      />
    </>
  );
}
