import Link from "next/link";
import { FOOTER_COLUMNS } from "@/lib/marketing/site-nav";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <p className="font-bold text-primary mb-2">goals.ac</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rank on Google and get cited by ChatGPT, with strategy and editorial control.
          </p>
        </div>
        {FOOTER_COLUMNS.map(({ title, links }) => (
          <div key={title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {title}
            </p>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={`${title}-${link.href}-${link.label}`}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} goals.ac. All rights reserved.
      </div>
    </footer>
  );
}
