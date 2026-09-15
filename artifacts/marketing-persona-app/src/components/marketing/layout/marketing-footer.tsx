import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/layout/marketing-logo";
import { FOOTER_COLUMNS } from "@/lib/marketing/site/site-nav";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background text-muted-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <MarketingLogo
            className="flex items-center gap-2 mb-3 text-foreground"
            textClassName="text-xl font-semibold tracking-tight"
            iconSize={22}
          />
          <p className="text-xs leading-relaxed tracking-normal">
            Rank on Google and get cited by ChatGPT, with strategy and editorial control.
          </p>
        </div>
        {FOOTER_COLUMNS.map(({ title, links }) => (
          <div key={title}>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {title}
            </p>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={`${title}-${link.href}-${link.label}`}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-normal">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-6 font-mono text-[11px] tracking-normal text-muted-foreground">
        © {new Date().getFullYear()} goals.ac. All rights reserved.
      </div>
    </footer>
  );
}
