"use client";

import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-client";
import { CreateContentModalShell } from "./create-content-modal-shell";
import { useCreateContentModal, type BriefContentDraft } from "./use-create-content-modal";

export type { BriefContentDraft };

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingPieces: ContentPieceRow[];
  onCreated: (piece: ContentPieceRow) => void;
  initialDraft?: BriefContentDraft | null;
  cmsConnections?: CmsConnectionSnapshot;
  primaryBlogDestination?: string | null;
}

export function CreateContentModal(props: Props) {
  const ctx = useCreateContentModal(props);
  return <CreateContentModalShell {...ctx} />;
}
