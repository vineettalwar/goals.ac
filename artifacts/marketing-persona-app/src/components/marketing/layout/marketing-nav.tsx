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
  "absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-60 max-w-80 rounded-sm border border-border bg-background p-2 z-200";

const MEGA_PANEL_CLASS =
  "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(560px,calc(100vw-2rem))] rounded-sm border border-border bg-background z-200 overflow-hidden";

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
            ? "px-3 py-1.5 text-sm font-medium text-foreground underline underline-offset-4 inline-flex items-center gap-1"
            : "px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
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

function DropdownLink({
  item,
  onNavigate,
  compact,
}: {
  item: NavLink;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={
        compact
          ? "block rounded-sm px-2 py-1 hover:bg-secondary transition-colors"
          : "block rounded-sm px-3 py-2 hover:bg-secondary transition-colors"
      }
    >
      <span className={compact ? "text-sm text-foreground" : "text-sm font-medium text-foreground"}>{item.label}</span>
      {!compact && item.description && (
        <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</span>
      )}
    </Link>
  );
}

function SolutionsMegaPanel({ onNavigate }: { onNavigate?: () => void }) {
  const grouped = solutionsByGroup();
  const teamItems = grouped.teams ?? [];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2 p-3">
        {MEGA_GRID_GROUPS.map((group) => {
          const items = grouped[group];
          if (!items?.length) return null;
          return (
            <div key={group} className="min-w-0">
              <p className="px-2 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {SOLUTION_GROUP_LABELS[group]}
              </p>
              <div>
                {items.map((item) => (
                  <DropdownLink key={item.href} item={item} onNavigate={onNavigate} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-3 py-2 flex items-center gap-4">
        {teamItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/solutions"
          onClick={onNavigate}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          View all →
        </Link>
      </div>
    </>
  );
}

function MobileSolutionsSection({ onNavigate }: { onNavigate: () => void }) {
  const grouped = solutionsByGroup();

  return (
    <div>
      <p className="marketing-section-label mb-3">Solutions</p>
      <div className="space-y-4">
        {(Object.keys(SOLUTION_GROUP_LABELS) as SolutionGroup[]).map((group) => {
          const items = grouped[group];
          if (!items?.length) return null;
          return (
            <div key={group}>
              <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {SOLUTION_GROUP_LABELS[group]}
              </p>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="text-foreground text-lg py-2 border-b border-border"
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
          className="text-muted-foreground text-base py-2 inline-block"
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
      <p className="marketing-section-label mb-2">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="text-foreground text-lg py-2 border-b border-border"
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

  const pillClass =
    "hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-1 py-1";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-100 isolate flex items-center justify-between border-b border-border bg-background p-4 font-sans sm:p-5">
        <MarketingLogo />

        <div className={pillClass}>
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
                ? "px-3 py-1.5 text-sm font-medium text-foreground underline underline-offset-4"
                : "px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                ? "px-3 py-1.5 text-sm font-medium text-foreground underline underline-offset-4"
                : "px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {loginHref.startsWith("http") ? (
              <a href={loginHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign in
              </a>
            ) : (
              <Link href={loginHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign in
              </Link>
            )}
            {PRODUCT_CTA_HREF.startsWith("http") ? (
              <a
                href={PRODUCT_CTA_HREF}
                className="hero-cta-primary text-sm font-medium"
              >
                {PRODUCT_CTA_PRIMARY}
              </a>
            ) : (
              <Link
                href={PRODUCT_CTA_HREF}
                className="hero-cta-primary text-sm font-medium"
              >
                {PRODUCT_CTA_PRIMARY}
              </Link>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden text-foreground p-2 -mr-2"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-90 overflow-y-auto bg-background px-6 pb-8 pt-20 lg:hidden">
          <div className="space-y-6">
            <MobileSection title="Product" items={PRODUCT_NAV} onNavigate={() => setMobileOpen(false)} />
            <MobileSolutionsSection onNavigate={() => setMobileOpen(false)} />
            <MobileSection title="Resources" items={RESOURCES_NAV} onNavigate={() => setMobileOpen(false)} />
            <div>
              <p className="marketing-section-label mb-2">More</p>
              <div className="flex flex-col gap-1">
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="text-foreground text-lg py-2 border-b border-border">
                  Plans
                </Link>
                <Link href="/contact" onClick={() => setMobileOpen(false)} className="text-foreground text-lg py-2 border-b border-border">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {PRODUCT_CTA_HREF.startsWith("http") ? (
                <a
                  href={PRODUCT_CTA_HREF}
                  onClick={() => setMobileOpen(false)}
                  className="hero-cta-primary text-center font-medium py-3"
                >
                  {PRODUCT_CTA_PRIMARY}
                </a>
              ) : (
                <Link
                  href={PRODUCT_CTA_HREF}
                  onClick={() => setMobileOpen(false)}
                  className="hero-cta-primary text-center font-medium py-3"
                >
                  {PRODUCT_CTA_PRIMARY}
                </Link>
              )}
              {loginHref.startsWith("http") ? (
                <a
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="text-muted-foreground text-center py-2"
                >
                  Sign in
                </a>
              ) : (
                <Link href={loginHref} onClick={() => setMobileOpen(false)} className="text-muted-foreground text-center py-2">
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
