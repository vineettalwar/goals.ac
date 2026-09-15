import type { ReactNode } from "react";
import { cn } from "../cn";
import type { AiProviderChoice } from "../settings/types";
import type { CmsPlatform } from "./types";
import type { EspDestinationDefinition, SocialDestinationDefinition } from "./publishing-destinations";
import { PublishBrandIcon, type PublishBrandIconId } from "./brand-logos";

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

/** Colored letter mark — fallback for tools without a brand SVG. */
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
  id,
  badgeLetter,
  badgeClassName,
}: {
  id?: PublishBrandIconId;
  badgeLetter?: string;
  badgeClassName?: string;
}) {
  if (id) {
    return <PublishBrandIcon id={id} className="h-8 w-8" />;
  }
  if (badgeLetter) {
    return <BrandBadge letter={badgeLetter} className={badgeClassName} size="sm" />;
  }
  return <PublishBrandIcon id="webhook" className="h-8 w-8" />;
}

export function AiProviderIcon({ provider }: { provider: AiProviderChoice }) {
  return <PublishBrandIcon id={provider} className="h-8 w-8" />;
}

export function OrgToolIcon({ tool }: { tool: "semrush" | "deepl" | "unsplash" | "pexels" }) {
  return <PublishBrandIcon id={tool} className="h-8 w-8" />;
}

export function CmsPlatformIcon({ platform }: { platform: CmsPlatform }) {
  return <PublishBrandIcon id={platform.key} className="h-8 w-8" />;
}

export function EspDestinationIcon({ destination }: { destination: EspDestinationDefinition }) {
  return <PublishBrandIcon id={destination.id} className="h-8 w-8" />;
}

export function SocialDestinationIcon({ destination }: { destination: SocialDestinationDefinition }) {
  return <PublishBrandIcon id={destination.id} className="h-8 w-8" />;
}

export function SearchProviderIcon({ provider }: { provider: "google_search_console" | "bing_webmaster" }) {
  return (
    <PublishBrandIcon
      id={provider === "google_search_console" ? "google_search_console" : "bing"}
      className="h-8 w-8"
    />
  );
}

export { PublishBrandIcon, type PublishBrandIconId } from "./brand-logos";
