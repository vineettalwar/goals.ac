import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ContentPieceNotFound,
  ContentPiecePublishDialog,
  ContentPieceRepurposeDialog,
  ContentPieceView,
  contentPieceCanDelete,
  contentPieceCanGenerate,
  contentPieceCanMarkReady,
  contentPieceCanPublish,
  contentPieceCanQueueSocial,
  formatQueueSocialSuccessMessage,
  isMetaCmsConnected,
  QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE,
  queueSocialComposerPayload,
  queueSocialInstagramSkipped,
  resolveSocialPiecePublicImageUrl,
  socialComposerPath,
  socialHubQueuePath,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useContentPieceData } from "@/hooks/use-content-piece-data";
import { apiFetch } from "@/lib/api";

export function ContentPiecePage() {
  const { id, pieceId } = useParams();
  const pieceParam = pieceId ?? id;
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const autoGenerateRequested = useRef(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [repurposeDialogOpen, setRepurposeDialogOpen] = useState(false);
  const [queueingSocial, setQueueingSocial] = useState(false);
  const [queueSocialFlash, setQueueSocialFlash] = useState<{
    level: "success" | "error";
    message: string;
  } | null>(null);
  const {
    loading,
    error,
    notFound,
    piece,
    generating,
    generatingState,
    generateMessage,
    generate,
    staleGenerating,
    resetToDraft,
    saving,
    saveMessage,
    save,
    humanizing,
    humanizeMessage,
    humanize,
    revertingHumanize,
    revertHumanize,
    deleting,
    deletePiece,
    markingReady,
    markReady,
    regenerating,
    regenerateMessage,
    regenerate,
    enhancing,
    enhanceMessage,
    enhance,
    repurpose,
    regeneratingImages,
    regenerateImages,
    attachingFeaturedImageUrl,
    attachFeaturedImageUrl,
    stockImagesConfigured,
    publishing,
    publishingState,
    publishMessage,
    publishToDestination,
    loadCmsConnections,
    renderPreview,
  } = useContentPieceData(pieceParam);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  // Canonicalize legacy /content-piece/:id → /projects/:projectId/content-piece/:id
  useEffect(() => {
    if (!piece || pieceId) return;
    if (!piece.websiteProjectId) return;
    const qs = searchParams.toString();
    navigate(
      `/projects/${piece.websiteProjectId}/content-piece/${piece.id}${qs ? `?${qs}` : ""}`,
      { replace: true },
    );
  }, [piece, pieceId, navigate, searchParams]);

  useEffect(() => {
    if (autoGenerateRequested.current) return;
    if (searchParams.get("generate") !== "1" || !piece) return;
    if (!contentPieceCanGenerate(piece.status)) {
      setSearchParams({}, { replace: true });
      return;
    }
    autoGenerateRequested.current = true;
    setSearchParams({}, { replace: true });
    void generate();
  }, [searchParams, piece, generate, setSearchParams]);

  if ((authLoading && !user) || (!user && !authLoading) || (loading && !piece)) {
    return (
      <p className="p-8 text-muted-foreground">
        {!authLoading && !user ? "Redirecting to sign in…" : "Loading content…"}
      </p>
    );
  }

  if (notFound) {
    return (
      <ContentPieceNotFound
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm text-red-700">{error}</p>
        <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
          ← Content studio
        </Link>
      </div>
    );
  }

  if (!piece) {
    return <p className="p-8 text-muted-foreground">Loading content…</p>;
  }

  async function queueSocial() {
    if (!piece?.websiteProjectId) return;
    setQueueingSocial(true);
    setQueueSocialFlash(null);
    try {
      let connections: Record<string, unknown> = {};
      try {
        connections = (await loadCmsConnections()) as Record<string, unknown>;
      } catch {
        // Queue LinkedIn+X only when connections cannot be loaded.
      }
      const metaConnected = isMetaCmsConnected(connections);
      let bodyMarkdown = piece.bodyMarkdown;
      let pieceMetadata = piece.pieceMetadata;
      let hasImage = Boolean(
        resolveSocialPiecePublicImageUrl({ bodyMarkdown, pieceMetadata }),
      );
      if (metaConnected && !hasImage && stockImagesConfigured) {
        try {
          const enriched = await regenerateImages();
          if (enriched) {
            bodyMarkdown = enriched.bodyMarkdown;
            pieceMetadata = enriched.pieceMetadata;
            hasImage = Boolean(
              resolveSocialPiecePublicImageUrl({ bodyMarkdown, pieceMetadata }),
            );
          }
        } catch {
          // Keep current hasImage; Instagram will be skipped below if still missing.
        }
      }
      const queueOptions = { metaConnected, hasImage };
      const payload = queueSocialComposerPayload(piece.id, queueOptions);
      const data = await apiFetch<{ pieces?: unknown[]; error?: string }>(
        socialComposerPath(piece.websiteProjectId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const successMessage = formatQueueSocialSuccessMessage(
        data.pieces?.length ?? 0,
        payload.platforms,
      );
      setQueueSocialFlash({
        level: "success",
        message: queueSocialInstagramSkipped(queueOptions)
          ? `${successMessage}. ${QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE}`
          : successMessage,
      });
      navigate(socialHubQueuePath(piece.websiteProjectId));
    } catch (err) {
      setQueueSocialFlash({
        level: "error",
        message: err instanceof Error ? err.message : "Could not queue social posts",
      });
    } finally {
      setQueueingSocial(false);
    }
  }

  return (
    <>
      {queueSocialFlash ? (
        <div
          className={`mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 ${
            queueSocialFlash.level === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            {queueSocialFlash.message}
          </p>
        </div>
      ) : null}
      <ContentPieceView
        piece={piece}
        generating={generating}
        generatingState={generatingState}
        generateMessage={generateMessage}
        staleGenerating={staleGenerating}
        onResetGeneration={resetToDraft}
        onGenerate={contentPieceCanGenerate(piece.status) ? generate : undefined}
        saving={saving}
        saveMessage={saveMessage}
        onSave={save}
        humanizing={humanizing}
        humanizeMessage={humanizeMessage}
        onHumanize={humanize}
        revertingHumanize={revertingHumanize}
        onRevertHumanize={revertHumanize}
        regenerating={regenerating}
        regenerateMessage={regenerateMessage}
        onRegenerate={regenerate}
        enhancing={enhancing}
        enhanceMessage={enhanceMessage}
        onEnhance={enhance}
        regeneratingImages={regeneratingImages}
        onRegenerateImages={
          stockImagesConfigured ? () => void regenerateImages() : undefined
        }
        attachingFeaturedImageUrl={attachingFeaturedImageUrl}
        onAttachFeaturedImageUrl={async (url) => {
          try {
            await attachFeaturedImageUrl(url);
          } catch {
            /* error already set on hook */
          }
        }}
        publishing={publishing || Boolean(publishingState)}
        publishingState={publishingState}
        publishMessage={publishMessage}
        onPublish={
          contentPieceCanPublish(piece.status) ? () => setPublishDialogOpen(true) : undefined
        }
        onDelete={
          contentPieceCanDelete(piece.status)
            ? async () => {
                await deletePiece();
                navigate(`/projects/${piece.websiteProjectId}/content-studio`, { replace: true });
              }
            : undefined
        }
        deleting={deleting}
        onMarkReady={
          contentPieceCanMarkReady(piece.status, piece.bodyMarkdown) ? markReady : undefined
        }
        markingReady={markingReady}
        onRepurpose={() => setRepurposeDialogOpen(true)}
        onQueueSocial={
          contentPieceCanQueueSocial(piece.formatType, piece.status, piece.bodyMarkdown)
            ? () => void queueSocial()
            : undefined
        }
        queueingSocial={queueingSocial}
        stockImagesConfigured={stockImagesConfigured}
        fetchDualScore={async (contentPieceId) => {
          try {
            return await apiFetch(`/api/content-pieces/${contentPieceId}/serp-score`);
          } catch {
            return null;
          }
        }}
        fetchBrief={async (briefId) => {
          try {
            return await apiFetch(`/api/briefs/${briefId}`);
          } catch {
            return null;
          }
        }}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />

      <ContentPiecePublishDialog
        open={publishDialogOpen}
        onClose={() => !publishing && setPublishDialogOpen(false)}
        formatType={piece.formatType}
        loadConnections={loadCmsConnections}
        publishing={publishing}
        integrationsHref={
          piece.websiteProjectId
            ? `/projects/${piece.websiteProjectId}/integrations`
            : "/integrations"
        }
        pieceTitle={piece.title}
        pieceBodyMarkdown={piece.bodyMarkdown}
        pieceFeaturedImageUrl={piece.pieceMetadata?.featuredImageUrl ?? null}
        onRenderPreview={renderPreview}
        onPublish={async (platform) => {
          await publishToDestination(platform);
          setPublishDialogOpen(false);
        }}
      />

      <ContentPieceRepurposeDialog
        open={repurposeDialogOpen}
        onClose={() => setRepurposeDialogOpen(false)}
        pieceId={piece.id}
        currentFormat={piece.formatType}
        onRepurpose={repurpose}
        onSuccess={(newPieceId) => {
          navigate(`/content-piece/${newPieceId}`, { replace: true });
        }}
      />
    </>
  );
}
