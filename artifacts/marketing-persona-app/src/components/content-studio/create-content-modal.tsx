"use client";

import type { AiProviderId } from "@workspace/ai-providers/config";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-utils";
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
  activeProvider?: AiProviderId;
  orgBedrockModel?: string | null;
  onVoiceRequired?: () => void;
  suggestedSections?: string[];
}

export function CreateContentModal(props: Props) {
  const ctx = useCreateContentModal(props);
  return <CreateContentModalShell {...ctx} />;
}
