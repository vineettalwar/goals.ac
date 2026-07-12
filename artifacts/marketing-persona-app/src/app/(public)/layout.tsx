import { type ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
