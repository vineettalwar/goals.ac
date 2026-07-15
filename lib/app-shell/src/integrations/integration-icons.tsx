import type { ReactNode } from "react";
import { Facebook, Globe, Instagram, Linkedin, Search, Twitter, Webhook } from "lucide-react";
import { cn } from "../cn";
import type { AiProviderChoice } from "../settings/types";
import type { CmsPlatform } from "./types";
import type { EspDestinationDefinition, SocialDestinationDefinition } from "./publishing-destinations";

export function IntegrationIconBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Colored letter mark — same visual language as CMS DestinationBadge tiles. */
export function BrandBadge({
  letter,
  className,
  size = "md",
}: {
  letter: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md font-bold text-white",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-xs",
        className ?? "bg-muted",
      )}
    >
      {letter}
    </span>
  );
}

export function DestinationBadge({
  badgeLetter,
  badgeClassName,
}: {
  badgeLetter?: string;
  badgeClassName?: string;
}) {
  if (badgeLetter) {
    return <BrandBadge letter={badgeLetter} className={badgeClassName} size="sm" />;
  }
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}

const AI_PROVIDER_BADGES: Record<AiProviderChoice, { letter: string; className: string }> = {
  gemini: { letter: "G", className: "bg-[#4285F4]" },
  openai: { letter: "AI", className: "bg-neutral-900" },
  anthropic: { letter: "A", className: "bg-[#D97757]" },
  bedrock: { letter: "B", className: "bg-[#232F3E] text-[#FF9900]" },
  ollama: { letter: "O", className: "bg-emerald-700" },
};

export function AiProviderIcon({ provider }: { provider: AiProviderChoice }) {
  const badge = AI_PROVIDER_BADGES[provider];
  return <BrandBadge letter={badge.letter} className={badge.className} />;
}

export function OrgToolIcon({ tool }: { tool: "semrush" | "deepl" | "unsplash" | "pexels" }) {
  switch (tool) {
    case "semrush":
      return <BrandBadge letter="S" className="bg-[#FF622D]" />;
    case "deepl":
      return <BrandBadge letter="D" className="bg-[#0F2B46]" />;
    case "unsplash":
      return <BrandBadge letter="U" className="bg-neutral-900" />;
    case "pexels":
      return <BrandBadge letter="P" className="bg-[#05A081]" />;
  }
}

export function CmsPlatformIcon({ platform }: { platform: CmsPlatform }) {
  if (platform.key === "webhook") {
    return <Webhook className="h-4 w-4 text-amber-600" />;
  }
  return (
    <DestinationBadge
      badgeLetter={platform.badgeLetter}
      badgeClassName={platform.badgeClassName}
    />
  );
}

export function EspDestinationIcon({ destination }: { destination: EspDestinationDefinition }) {
  return (
    <DestinationBadge
      badgeLetter={destination.badgeLetter}
      badgeClassName={destination.badgeClassName}
    />
  );
}

export function SocialDestinationIcon({ destination }: { destination: SocialDestinationDefinition }) {
  switch (destination.id) {
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-blue-600" />;
    case "twitter":
      return <Twitter className="h-4 w-4 text-sky-500" />;
    case "meta":
      return (
        <span className="inline-flex items-center gap-0.5">
          <Facebook className="h-3.5 w-3.5 text-blue-700" />
          <Instagram className="h-3.5 w-3.5 text-fuchsia-600" />
        </span>
      );
    case "bluesky":
      return <Globe className="h-4 w-4 text-sky-500" />;
    case "mastodon":
      return <Globe className="h-4 w-4 text-violet-500" />;
    default:
      return <Globe className="h-4 w-4 text-muted-foreground" />;
  }
}

export function SearchProviderIcon({ provider }: { provider: "google_search_console" | "bing_webmaster" }) {
  if (provider === "google_search_console") {
    return <Search className="h-4 w-4 text-blue-600" />;
  }
  return <Search className="h-4 w-4 text-teal-600" />;
}
