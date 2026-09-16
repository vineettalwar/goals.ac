import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Data processing agreement",
  description: "How German and EU B2B customers request an AVV/DPA with Some Tech Work UG.",
  robots: { index: true, follow: true },
};

export default function DpaPage() {
  return (
    <LegalPageClient titleLine1="DPA" titleLine2="/ AVV" lastUpdated="September 17, 2026">
      <p className="text-sm text-white/65 leading-relaxed">
        For GDPR Art. 28, German customers usually need an Auftragsverarbeitungsvertrag (AVV). We
        do not offer in-app clickwrap. Counsel must review the draft before it is signed.
      </p>
      <p className="text-sm text-white/65 leading-relaxed">
        Roles: you are the controller of your workspace content and of personal data you put into
        the product. Some Tech Work UG (haftungsbeschränkt) is the processor for that content. For
        our own billing, security logs, and marketing-site visitors, we are the controller. See{" "}
        <Link className="text-(--accent-warm) hover:underline" href="/privacy">
          Privacy
        </Link>{" "}
        and{" "}
        <Link className="text-(--accent-warm) hover:underline" href="/subprocessors">
          Subprocessors
        </Link>
        .
      </p>
      <p className="text-sm text-white/65 leading-relaxed">
        Request a signed copy:{" "}
        <a className="text-(--accent-warm) hover:underline" href="mailto:privacy@goals.ac">
          privacy@goals.ac
        </a>
        . Internal engineering outline (not a contract):{" "}
        <code className="text-white/80">docs/legal/dpa-template.md</code> in the product repository.
      </p>
    </LegalPageClient>
  );
}
