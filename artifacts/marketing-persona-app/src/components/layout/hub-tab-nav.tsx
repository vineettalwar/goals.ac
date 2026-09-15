"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/app-shell/cn";
import type { SectionTab } from "@workspace/app-shell/section";

export function HubTabNav({ tabs }: { tabs: readonly SectionTab[] }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1" aria-label="Section">
      {tabs.map((tab) => {
        const keywordsHub = tab.to === "/search/keywords" && pathname === "/search";
        const active = tab.exact
          ? pathname === tab.to
          : keywordsHub || pathname === tab.to || pathname.startsWith(`${tab.to}/`);
        return (
          <Link
            key={tab.to}
            href={tab.to}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
