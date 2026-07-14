export type PublishingPendingAction =
  | "testing_health"
  | "selecting_meta_page"
  | "disconnecting_linkedin"
  | "disconnecting_twitter"
  | "disconnecting_meta"
  | null;

export function isPublishingActionPending(
  pendingAction: PublishingPendingAction,
  action: Exclude<PublishingPendingAction, null>,
): boolean {
  return pendingAction === action;
}
