"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  isNavActive,
  PRODUCT_NAV,
  RESOURCES_NAV,
  SOLUTIONS_NAV,
  SOLUTION_GROUP_LABELS,
  type NavLink,
  type SolutionGroup,
  type SolutionNavItem,
} from "@/lib/marketing/site-nav";
import { CONTACT_CTA_SECONDARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

type DropdownProps = {
  label: string;
  children: ReactNode;
  pathname: string;
  activePrefixes: string[];
};

function NavDropdown({ label, children, pathname, activePrefixes }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = activePrefixes.some((prefix) => isNavActive(pathname, prefix));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          active
            ? "px-3 py-1.5 rounded-full text-sm font-medium text-white bg-white/20 inline-flex items-center gap-1"
            : "px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors inline-flex items-center gap-1"
        }
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[240px] max-w-[320px] rounded-xl bg-white/95 backdrop-blur-md border border-white/40 shadow-xl p-2 z-200">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ item, onNavigate }: { item: NavLink; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="block rounded-lg px-3 py-2 hover:bg-black/5 transition-colors"
    >
      <span className="text-sm font-medium text-gray-900">{item.label}</span>
      {item.description && (
        <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{item.description}</span>
      )}
    </Link>
  );
}

function SolutionsDropdownContent({ onNavigate }: { onNavigate?: () => void }) {
  const groups = SOLUTIONS_NAV.reduce(
    (acc, item) => {
      acc[item.group] ??= [];
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<SolutionGroup, SolutionNavItem[]>,
  );

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {(Object.keys(SOLUTION_GROUP_LABELS) as SolutionGroup[]).map((group) => {
        const items = groups[group];
        if (!items?.length) return null;
        return (
          <div key={group} className="mb-1 last:mb-0">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {SOLUTION_GROUP_LABELS[group]}
            </p>
            {items.map((item) => (
              <DropdownLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        );
      })}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <DropdownLink item={{ label: "View all solutions", href: "/solutions" }} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function MobileSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavLink[];
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-white/50 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="text-white text-lg py-2 border-b border-white/10"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const productPrefixes = PRODUCT_NAV.map((i) => i.href);
  const solutionsPrefixes = [...SOLUTIONS_NAV.map((i) => i.href), "/solutions"];
  const resourcesPrefixes = RESOURCES_NAV.map((i) => i.href);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-100 flex items-center justify-between p-4 sm:p-5 font-sans">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff" aria-hidden>
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">goals.ac</span>
        </Link>

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <NavDropdown label="Product" pathname={pathname} activePrefixes={productPrefixes}>
            {PRODUCT_NAV.map((item) => (
              <DropdownLink key={item.href} item={item} />
            ))}
          </NavDropdown>

          <NavDropdown label="Solutions" pathname={pathname} activePrefixes={solutionsPrefixes}>
            <SolutionsDropdownContent />
          </NavDropdown>

          <Link
            href="/pricing"
            className={
              isNavActive(pathname, "/pricing")
                ? "px-3 py-1.5 rounded-full text-sm font-medium text-white bg-white/20"
                : "px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            }
          >
            Engagements
          </Link>

          <NavDropdown label="Resources" pathname={pathname} activePrefixes={resourcesPrefixes}>
            {RESOURCES_NAV.map((item) => (
              <DropdownLink key={item.href} item={item} />
            ))}
          </NavDropdown>

          <Link
            href="/contact"
            className={
              isNavActive(pathname, "/contact")
                ? "px-3 py-1.5 rounded-full text-sm font-medium text-white bg-white/20"
                : "px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            }
          >
            Contact
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href={CONTACT_HREF}
            className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            {CONTACT_CTA_SECONDARY}
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden text-white p-2 -mr-2"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-90 bg-black/80 backdrop-blur-sm lg:hidden pt-20 px-6 pb-8 overflow-y-auto">
          <div className="space-y-6">
            <MobileSection title="Product" items={PRODUCT_NAV} onNavigate={() => setMobileOpen(false)} />
            <MobileSection title="Solutions" items={[...SOLUTIONS_NAV, { label: "All solutions", href: "/solutions" }]} onNavigate={() => setMobileOpen(false)} />
            <MobileSection title="Resources" items={RESOURCES_NAV} onNavigate={() => setMobileOpen(false)} />
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-2">More</p>
              <div className="flex flex-col gap-1">
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="text-white text-lg py-2 border-b border-white/10">
                  Engagements
                </Link>
                <Link href="/contact" onClick={() => setMobileOpen(false)} className="text-white text-lg py-2 border-b border-white/10">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Link href={CONTACT_HREF} onClick={() => setMobileOpen(false)} className="bg-white text-gray-900 text-center font-semibold py-3 rounded-full">
                {CONTACT_CTA_SECONDARY}
              </Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-white/80 text-center py-2">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
