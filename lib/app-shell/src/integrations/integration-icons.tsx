import type { ReactNode } from "react";
import { Facebook, Globe, Instagram, Linkedin, Search, Twitter, Webhook } from "lucide-react";
import { cn } from "../cn";
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

export function DestinationBadge({
  badgeLetter,
  badgeClassName,
}: {
  badgeLetter?: string;
  badgeClassName?: string;
}) {
  if (badgeLetter) {
    return (
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white",
          badgeClassName ?? "bg-muted",
        )}
      >
        {badgeLetter}
      </span>
    );
  }
  return <Globe className="h-4 w-4 text-muted-foreground" />;
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
