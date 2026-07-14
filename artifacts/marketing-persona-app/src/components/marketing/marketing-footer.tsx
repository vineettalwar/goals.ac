import Link from "next/link";
import { FOOTER_COLUMNS } from "@/lib/marketing/site-nav";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white/70">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <p className="font-bold text-white mb-2">goals.ac</p>
          <p className="text-xs text-white/60 leading-relaxed">
            Rank on Google and get cited by ChatGPT, with strategy and editorial control.
          </p>
        </div>
        {FOOTER_COLUMNS.map(({ title, links }) => (
          <div key={title}>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
              {title}
            </p>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={`${title}-${link.href}-${link.label}`}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-6 text-xs text-white/50">
        © {new Date().getFullYear()} goals.ac. All rights reserved.
      </div>
    </footer>
  );
}
