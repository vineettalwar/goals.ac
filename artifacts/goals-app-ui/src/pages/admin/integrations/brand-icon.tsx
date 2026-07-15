import type { ComponentType } from "react";
import { cn } from "@workspace/app-shell";
import type { PlatformIntegrationId } from "./types";

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#635BFF" />
      <path
        fill="#fff"
        d="M13.3 10.1c-1.6-.6-2.5-1.1-2.5-1.9 0-.7.6-1.1 1.5-1.1 1.8 0 3.6.7 4.8 1.3l.7-4.4c-1.4-.5-3-1-5.1-1-2 0-3.7.5-4.9 1.5-1.3 1-2 2.5-2 4.4 0 2 1.3 3.1 3.7 4.1 1.9.7 2.6 1.2 2.6 2.1 0 .8-.7 1.2-1.9 1.2-1.5 0-4-.7-5.6-1.7l-.7 4.4c1.8.7 3.9 1.1 6.1 1.1 2.1 0 3.9-.5 5.1-1.5 1.3-1 2-2.6 2-4.6 0-2.2-1-3.3-3.7-4.4Z"
      />
    </svg>
  );
}

function ResendLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        fill="#fff"
        d="M6.8 7.8h4.8c2.4 0 4 1.3 4 3.4 0 1.4-.8 2.5-2.2 3.1l2.8 3.4h-2.7l-2.4-3H9.2v3H6.8V7.8Zm2.6 2v2.6h2.1c1.1 0 1.7-.5 1.7-1.3s-.6-1.3-1.7-1.3H9.4Z"
      />
    </svg>
  );
}

function UnsplashLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#000" />
      <path fill="#fff" d="M7.2 7.2h3v3h-3v-3Zm6.6 0h3v3h-3v-3ZM7.2 13.8h3v3h-3v-3Zm6.6 0h3v3h-3v-3Z" />
    </svg>
  );
}

function PexelsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#05A081" />
      <path
        fill="#fff"
        d="M8.4 7.8h2.1l2.1 3.3 2.1-3.3h2.1l-3 4.3 3.1 4.3h-2.2l-2.2-3.2-2.2 3.2H8.4l3.1-4.3-3.1-4.3Z"
      />
    </svg>
  );
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.1 9.4h2.2v7.5H7.1V9.4Zm1.1-3.5c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3-1.3-.6-1.3-1.3.6-1.3 1.3-1.3ZM10.8 9.4h2.1v1h0c.3-.6 1.1-1.2 2.2-1.2 2.4 0 2.8 1.6 2.8 3.6v4.1h-2.2v-3.6c0-.9 0-2-1.2-2s-1.4 1-1.4 2v3.6h-2.2V9.4Z"
      />
    </svg>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        fill="#fff"
        d="M16.8 6.8h1.9l-4.1 4.7 4.9 5.7h-3.8l-3-3.5-3.4 3.5H6.4l4.4-5.1L6.2 6.8h3.9l2.7 3.2 3-3.2Zm-.7 9.4h1.1L9 7.7H7.9l8.2 8.5Z"
      />
    </svg>
  );
}

function MetaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#0866FF" />
      <path
        fill="#fff"
        d="M7.2 14.6c-1.1 0-1.9-.8-1.9-2 0-1.8 1.5-3.4 3.3-3.4.7 0 1.3.2 1.8.6l-.9 1.1c-.3-.2-.6-.3-1-.3-.9 0-1.6.8-1.6 1.9 0 .5.3.9.8.9.7 0 1.2-.8 1.6-1.7.5-1.1 1-2.2 2.1-2.2.9 0 1.5.6 1.5 1.6 0 .3 0 .6-.1.9l-1.5 4.8h-1.5l1.4-4.5c0-.2.1-.4.1-.6 0-.3-.1-.5-.4-.5-.5 0-.9.7-1.3 1.5-.6 1.3-1.3 2.9-2.9 2.9Zm6.1 0c-1.1 0-1.9-.8-1.9-2 0-1.8 1.5-3.4 3.3-3.4.7 0 1.3.2 1.8.6l-.9 1.1c-.3-.2-.6-.3-1-.3-.9 0-1.6.8-1.6 1.9 0 .5.3.9.8.9.7 0 1.2-.8 1.6-1.7.2-.4.4-.8.6-1.1h1.5c-.2.5-.3 1-.5 1.5-.5 1.3-1.3 2.5-2.7 2.5Z"
      />
    </svg>
  );
}

function BlueskyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#1185FE" />
      <path
        fill="#fff"
        d="M7.2 7.8c1.6 1.2 3.3 3.7 3.8 5 .5-1.3 2.2-3.8 3.8-5 1.1-.9 2.9-1.6 2.9.6 0 .4-.2 3.5-.4 4-.7 1.6-3.1 2-3.1.4l.1-1.2c-.1 1.3-.5 2.7-1.4 3.7-.5.5-.1.7.4 1.1 1.3.9 2.9.9 3.4.9-.1.3-.4 1.3-1.3 1.9-.9.6-2 .7-3.1.5-.3-.1-.6-.2-.9-.3-.8-.3-1.5-.3-2.3 0-.3.1-.6.2-.9.3-1.1.2-2.2.1-3.1-.5-.9-.6-1.2-1.6-1.3-1.9.5 0 2.1 0 3.4-.9.5-.4.9-.6.4-1.1-.9-1-1.3-2.4-1.4-3.7l.1 1.2c0 1.6-2.4 1.2-3.1-.4-.2-.5-.4-3.6-.4-4 0-2.2 1.8-1.5 2.9-.6Z"
      />
    </svg>
  );
}

function BedrockLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#232F3E" />
      <path fill="#FF9900" d="M7 15.2 12 7l5 8.2H7Zm1.7-1.4h6.6L12 9.4 8.7 13.8Z" />
    </svg>
  );
}

const LOGOS: Record<PlatformIntegrationId, ComponentType<{ className?: string }>> = {
  stripe: StripeLogo,
  resend: ResendLogo,
  unsplash: UnsplashLogo,
  pexels: PexelsLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  meta: MetaLogo,
  bluesky: BlueskyLogo,
  bedrock: BedrockLogo,
};

export function PlatformIntegrationBrandIcon({
  id,
  className,
}: {
  id: PlatformIntegrationId;
  className?: string;
}) {
  const Logo = LOGOS[id];
  return <Logo className={cn("h-8 w-8 shrink-0", className)} />;
}
