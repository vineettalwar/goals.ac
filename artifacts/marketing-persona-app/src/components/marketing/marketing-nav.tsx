"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Content Engine", href: "/content-engine" },
  { label: "Features", href: "/features" },
  { label: "Roadmaps", href: "/roadmaps" },
  { label: "GEO Audit", href: "/geo-audit" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-100 flex items-center justify-between p-4 sm:p-5 font-sans">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff" aria-hidden>
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">goals.ac</span>
        </Link>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          {NAV_ITEMS.map(({ label, href }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                className={
                  active
                    ? "px-4 py-1.5 rounded-full text-sm font-medium text-white bg-white/20"
                    : "px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden text-white p-2 -mr-2"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-99 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute top-16 left-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex flex-col gap-1 font-sans">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={
                  isActive(pathname, href)
                    ? "px-4 py-3 rounded-xl text-sm font-medium text-white bg-white/15"
                    : "px-4 py-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                }
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/signup"
              className="mt-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 text-center hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors text-center"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
