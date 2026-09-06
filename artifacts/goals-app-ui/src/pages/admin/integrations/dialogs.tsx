// Thin orchestrator — re-exports AdminIntegrationsDialogs (the only public surface).
// Dialog groups: dialogs-payments, dialogs-stock, dialogs-social, dialogs-bedrock.
// Shared primitives: dialogs-shared.
import type { AdminIntegrationsController } from "./use-controller";
import { AdminDialog } from "./dialogs-shared";
import { StripeDialog, ResendDialog } from "./dialogs-payments";
import { UnsplashDialog, PexelsDialog } from "./dialogs-stock";
import { LinkedInDialog, TwitterDialog, MetaDialog, BlueskyDialog } from "./dialogs-social";
import { BedrockDialog } from "./dialogs-bedrock";

const DIALOG_TITLES: Record<string, string> = {
  stripe: "Stripe",
  resend: "Resend",
  unsplash: "Unsplash",
  pexels: "Pexels",
  linkedin: "LinkedIn",
  twitter: "X",
  meta: "Meta",
  bluesky: "Bluesky",
  bedrock: "AWS Bedrock",
};

export function AdminIntegrationsDialogs({
  controller,
}: {
  controller: AdminIntegrationsController;
}) {
  const { activeDialog, closeDialog } = controller;

  return (
    <AdminDialog
      open={activeDialog != null}
      title={activeDialog ? (DIALOG_TITLES[activeDialog] ?? activeDialog) : ""}
      onClose={closeDialog}
    >
      {activeDialog === "stripe" && <StripeDialog controller={controller} />}
      {activeDialog === "resend" && <ResendDialog controller={controller} />}
      {activeDialog === "unsplash" && <UnsplashDialog controller={controller} />}
      {activeDialog === "pexels" && <PexelsDialog controller={controller} />}
      {activeDialog === "linkedin" && <LinkedInDialog controller={controller} />}
      {activeDialog === "twitter" && <TwitterDialog controller={controller} />}
      {activeDialog === "meta" && <MetaDialog controller={controller} />}
      {activeDialog === "bluesky" && <BlueskyDialog controller={controller} />}
      {activeDialog === "bedrock" && <BedrockDialog controller={controller} />}
    </AdminDialog>
  );
}
