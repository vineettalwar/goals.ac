// Thin orchestrator — re-exports AdminIntegrationsDialogs (the only public surface).
// Dialog groups: dialogs-payments, dialogs-stock, dialogs-social, dialogs-bedrock.
// Shared primitives: dialogs-shared.
import type { AdminIntegrationsController } from "./use-controller";
import { AdminDialog } from "./dialogs-shared";
import { StripeDialog, ResendDialog } from "./dialogs-payments";
import { UnsplashDialog, PexelsDialog } from "./dialogs-stock";
import { LinkedInDialog, TwitterDialog, MetaDialog, BlueskyDialog, BingDialog } from "./dialogs-social";
import { BedrockDialog } from "./dialogs-bedrock";
import { GoogleDialog, EnvAiProviderDialog, MastodonDialog } from "./dialogs-env";

const DIALOG_TITLES: Record<string, string> = {
  stripe: "Stripe",
  resend: "Resend",
  unsplash: "Unsplash",
  pexels: "Pexels",
  linkedin: "LinkedIn",
  twitter: "X",
  meta: "Meta",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  bing: "Bing Webmaster",
  google: "Google",
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  groq: "Groq",
  nvidia: "NVIDIA NIM",
  ollama: "Ollama",
  bedrock: "AWS Bedrock",
};

const ENV_AI_DIALOGS = new Set([
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
  "groq",
  "nvidia",
  "ollama",
]);

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
      {activeDialog === "bing" && <BingDialog controller={controller} />}
      {activeDialog === "google" && <GoogleDialog controller={controller} />}
      {activeDialog && ENV_AI_DIALOGS.has(activeDialog) ? (
        <EnvAiProviderDialog controller={controller} />
      ) : null}
      {activeDialog === "mastodon" && <MastodonDialog controller={controller} />}
      {activeDialog === "bedrock" && <BedrockDialog controller={controller} />}
    </AdminDialog>
  );
}
