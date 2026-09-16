import { type ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/layout/marketing-footer";
import { MarketingNav } from "@/components/marketing/layout/marketing-nav";
import { EssentialCookieNotice } from "@/components/marketing/layout/essential-cookie-notice";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-register flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-foreground"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <MarketingFooter />
      <EssentialCookieNotice />
    </div>
  );
}
