import { type ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/layout/marketing-footer";
import { MarketingNav } from "@/components/marketing/layout/marketing-nav";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
