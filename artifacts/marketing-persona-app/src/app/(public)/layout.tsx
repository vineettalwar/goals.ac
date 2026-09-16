import { type ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/layout/marketing-footer";
import { MarketingNav } from "@/components/marketing/layout/marketing-nav";
import { EssentialCookieNotice } from "@/components/marketing/layout/essential-cookie-notice";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-register flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <EssentialCookieNotice />
    </div>
  );
}
