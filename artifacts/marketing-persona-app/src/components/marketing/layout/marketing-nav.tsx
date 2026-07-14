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
  solutionsByGroup,
  type NavLink,
  type SolutionGroup,
} from "@/lib/marketing/site/site-nav";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { useAppAuthHrefs } from "@/lib/marketing/site/use-app-auth-hrefs";
import { MarketingLogo } from "@/components/marketing/layout/marketing-logo";

const DEFAULT_PANEL_CLASS =
  "absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[240px] max-w-[320px] rounded-xl bg-black/90 backdrop-blur-md border border-white/15 shadow-xl shadow-black/50 p-2 z-200";

const MEGA_PANEL_CLASS =
  "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(780px,calc(100vw-2rem))] rounded-xl bg-black/90 backdrop-blur-md border border-white/15 shadow-xl shadow-black/50 z-200 overflow-hidden";

const MEGA_GRID_GROUPS: SolutionGroup[] = ["ai-search", "content", "authority"];

type DropdownProps = {
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  pathname: string;
  activePrefixes: string[];
  panelClassName?: string;
};

function NavDropdown({ label, children, pathname, activePrefixes, panelClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = activePrefixes.some((prefix) => isNavActive(pathname, prefix));
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
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
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={panelClassName ?? DEFAULT_PANEL_CLASS}>
          {typeof children === "function" ? children(close) : children}
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
      className="block rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
    >
      <span className="text-sm font-medium text-white">{item.label}</span>
      {item.description && (
        <span className="block text-xs text-white/50 mt-0.5 leading-snug">{item.description}</span>
      )}
    </Link>
  );
}

function SolutionsMegaPanel({ onNavigate }: { onNavigate?: () => void }) {
  const grouped = solutionsByGroup();
  const teamItems = grouped.teams ?? [];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
        {MEGA_GRID_GROUPS.map((group) => {
          const items = grouped[group];
          if (!items?.length) return null;
          return (
            <div key={group} className="min-w-0">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                {SOLUTION_GROUP_LABELS[group]}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <DropdownLink key={item.href} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {teamItems.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-white/60">
            {SOLUTION_GROUP_LABELS.teams}
          </p>
          {teamItems.map((item) => (
            <DropdownLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      <div className="border-t border-white/10 px-2 py-2 bg-white/5">
        <DropdownLink
          item={{ label: "View all solutions", href: "/solutions", description: "Browse every outcome we help with" }}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}

function MobileSolutionsSection({ onNavigate }: { onNavigate: () => void }) {
  const grouped = solutionsByGroup();

  return (
    <div>
      <p className="marketing-section-label text-white/70 mb-3">Solutions</p>
      <div className="space-y-4">
        {(Object.keys(SOLUTION_GROUP_LABELS) as SolutionGroup[]).map((group) => {
          const items = grouped[group];
          if (!items?.length) return null;
          return (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1">
                {SOLUTION_GROUP_LABELS[group]}
              </p>
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
        })}
        <Link
          href="/solutions"
          onClick={onNavigate}
          className="text-white/80 text-base py-2 inline-block"
        >
          View all solutions →
        </Link>
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
      <p className="marketing-section-label text-white/70 mb-2">{title}</p>
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
  const { loginHref } = useAppAuthHrefs();

  const productPrefixes = PRODUCT_NAV.map((i) => i.href);
  const solutionsPrefixes = [...SOLUTIONS_NAV.map((i) => i.href), "/solutions"];
  const resourcesPrefixes = RESOURCES_NAV.map((i) => i.href);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-100 isolate flex items-center justify-between p-4 sm:p-5 font-sans">
        <MarketingLogo />

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <NavDropdown label="Product" pathname={pathname} activePrefixes={productPrefixes}>
            {(close) =>
              PRODUCT_NAV.map((item) => <DropdownLink key={item.href} item={item} onNavigate={close} />)
            }
          </NavDropdown>

          <NavDropdown
            label="Solutions"
            pathname={pathname}
            activePrefixes={solutionsPrefixes}
            panelClassName={MEGA_PANEL_CLASS}
          >
            {(close) => <SolutionsMegaPanel onNavigate={close} />}
          </NavDropdown>

          <Link
            href="/pricing"
            className={
              isNavActive(pathname, "/pricing")
                ? "px-3 py-1.5 rounded-full text-sm font-medium text-white bg-white/20"
                : "px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            }
          >
            Plans
          </Link>

          <NavDropdown label="Resources" pathname={pathname} activePrefixes={resourcesPrefixes}>
            {(close) =>
              RESOURCES_NAV.map((item) => <DropdownLink key={item.href} item={item} onNavigate={close} />)
            }
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
          {loginHref.startsWith("http") ? (
            <a href={loginHref} className="text-sm text-white/80 hover:text-white transition-colors">
              Sign in
            </a>
          ) : (
            <Link href={loginHref} className="text-sm text-white/80 hover:text-white transition-colors">
              Sign in
            </Link>
          )}
          {PRODUCT_CTA_HREF.startsWith("http") ? (
            <a
              href={PRODUCT_CTA_HREF}
              className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              {PRODUCT_CTA_PRIMARY}
            </a>
          ) : (
            <Link
              href={PRODUCT_CTA_HREF}
              className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              {PRODUCT_CTA_PRIMARY}
            </Link>
          )}
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
            <MobileSolutionsSection onNavigate={() => setMobileOpen(false)} />
            <MobileSection title="Resources" items={RESOURCES_NAV} onNavigate={() => setMobileOpen(false)} />
            <div>
              <p className="marketing-section-label text-white/70 mb-2">More</p>
              <div className="flex flex-col gap-1">
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="text-white text-lg py-2 border-b border-white/10">
                  Plans
                </Link>
                <Link href="/contact" onClick={() => setMobileOpen(false)} className="text-white text-lg py-2 border-b border-white/10">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {PRODUCT_CTA_HREF.startsWith("http") ? (
                <a
                  href={PRODUCT_CTA_HREF}
                  onClick={() => setMobileOpen(false)}
                  className="bg-white text-gray-900 text-center font-semibold py-3 rounded-full"
                >
                  {PRODUCT_CTA_PRIMARY}
                </a>
              ) : (
                <Link
                  href={PRODUCT_CTA_HREF}
                  onClick={() => setMobileOpen(false)}
                  className="bg-white text-gray-900 text-center font-semibold py-3 rounded-full"
                >
                  {PRODUCT_CTA_PRIMARY}
                </Link>
              )}
              {loginHref.startsWith("http") ? (
                <a
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 text-center py-2"
                >
                  Sign in
                </a>
              ) : (
                <Link href={loginHref} onClick={() => setMobileOpen(false)} className="text-white/80 text-center py-2">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
