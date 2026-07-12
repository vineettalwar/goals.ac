import Link from "next/link";
import { type ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>

      <footer className="border-t border-[--border] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-bold text-primary mb-2">goals.ac</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered growth strategy and content for B2B startups.
            </p>
          </div>
          {[
            {
              title: "Product",
              links: [
                ["Features", "/features"],
                ["Roadmaps", "/roadmaps"],
                ["Pricing", "/pricing"],
              ],
            },
            { title: "Company", links: [["About", "/about"]] },
            {
              title: "Legal",
              links: [
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {title}
              </p>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
                      {label}
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
    </div>
  );
}
