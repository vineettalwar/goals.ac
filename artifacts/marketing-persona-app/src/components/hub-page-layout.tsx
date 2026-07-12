"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HubTab } from "@/lib/hub-tabs";

interface HubPageLayoutProps {
  title: string;
  description: string;
  tabs: HubTab[];
  basePath: string;
  children: React.ReactNode;
}

export function HubPageLayout({ title, description, tabs, basePath, children }: HubPageLayoutProps) {
  const pathname = usePathname();

  function isTabActive(href: string) {
    if (pathname === href) return true;
    // `/search` renders the Keywords panel directly.
    if (pathname === basePath && href === `${basePath}/keywords`) return true;
    if (href === basePath && pathname === basePath) return true;
    return pathname.startsWith(`${href}/`);
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <nav className="border-b border-border" aria-label={`${title} sections`}>
        <ul className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors whitespace-nowrap",
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {tab.badge ? (
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {tab.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
