"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminSubnavItem = {
  label: string;
  href: string;
  exact?: boolean;
};

function isTabActive(pathname: string, item: AdminSubnavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSubnav({ items }: { items: AdminSubnavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 border-b border-border" aria-label="Section">
      {items.map((item) => {
        const active = isTabActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
