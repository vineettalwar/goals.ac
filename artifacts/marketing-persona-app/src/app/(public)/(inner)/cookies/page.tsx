import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Cookie notice",
  description: "Essential cookies used by goals.ac. No advertising cookies.",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <LegalPageClient titleLine1="Cookie" titleLine2="notice" lastUpdated="September 17, 2026">
      <p className="text-sm text-white/65 leading-relaxed">
        German TDDDG § 25: storing information on your device needs consent unless it is strictly
        necessary for a service you requested. Our session cookie is necessary to keep you signed in.
        The active-project cookie is necessary to remember which site you opened in the product. We do
        not set advertising or analytics cookies, so we do not load a CMP.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-white/65 leading-relaxed">
        <li>
          <strong className="text-white/80">authjs.session-token</strong> (or{" "}
          <strong className="text-white/80">__Secure-authjs.session-token</strong> on HTTPS) — HttpOnly, SameSite=Lax, keeps you signed in. Max-Age 30 days unless your org shortens it.
        </li>
        <li>
          <strong className="text-white/80">active-project</strong> — remembers the last project in the product UI. Not HttpOnly.
        </li>
        <li>
          <strong className="text-white/80">goals_ac_cookie_ok</strong> — stores that you dismissed this essential-cookie notice (localStorage, not a cookie).
        </li>
      </ul>
    </LegalPageClient>
  );
}
