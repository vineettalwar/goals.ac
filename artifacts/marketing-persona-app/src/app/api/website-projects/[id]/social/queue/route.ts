import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import {
  listSocialQueue,
  platformForPiece,
} from "@workspace/content-engine/support/social-queue-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import type { ContentPieceApprovalStatus } from "@workspace/db/schema";

const APPROVAL_STATUSES = new Set<ContentPieceApprovalStatus>([
  "draft",
  "pending_review",
  "approved",
  "rejected",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(req.url);
  const platformRaw = url.searchParams.get("platform");
  const approvalRaw = url.searchParams.get("approvalStatus");
  const platform =
    platformRaw && isValidSocialPlatform(platformRaw) ? platformRaw : undefined;
  const approvalStatus =
    approvalRaw && APPROVAL_STATUSES.has(approvalRaw as ContentPieceApprovalStatus)
      ? (approvalRaw as ContentPieceApprovalStatus)
      : undefined;

  const pieces = await listSocialQueue({
    projectId,
    platform,
    approvalStatus,
  });

  return Response.json({
    items: pieces.map((piece) => ({
      ...piece,
      platform: platformForPiece(piece),
      scheduledAt: piece.scheduledAt?.toISOString() ?? null,
      approvedAt: piece.approvedAt?.toISOString() ?? null,
    })),
  });
}
