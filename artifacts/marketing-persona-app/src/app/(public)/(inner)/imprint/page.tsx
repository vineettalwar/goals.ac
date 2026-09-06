import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Imprint",
  description:
    "Legal disclosure (Impressum) for goals.ac / Some Tech Work UG (haftungsbeschränkt): register, representation, contact, and EU dispute resolution.",
  robots: { index: true, follow: true },
};

export default function ImprintPage() {
  return (
    <LegalPageClient titleLine1="Imprint" lastUpdated="September 6, 2026">
      <section className="space-y-3">
        <p className="text-sm text-white/65 leading-relaxed">
          German statutory disclosure (Impressum) for our UG, plus the standard EU ODR notice. Site
          copy elsewhere stays in English; this block follows TMG practice.
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Legal form: Unternehmergesellschaft (haftungsbeschränkt)
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What this page is</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Some Tech Work UG (haftungsbeschränkt) is incorporated in Germany and operates goals.ac.
          Section 5 of the Telemediengesetz (TMG) requires a dedicated disclosure of business identity,
          representation, and register data for commercial sites. The German section below is the
          operative legal notice.
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          General site rules and liability caps for use of goals.ac live under{" "}
          <Link className="text-(--accent-warm) hover:underline" href="/terms">
            Terms of service
          </Link>
          . Data processing is described under{" "}
          <Link className="text-(--accent-warm) hover:underline" href="/privacy">
            Privacy policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Angaben gemäß § 5 TMG</h2>
        <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">
          {`Some Tech Work UG (haftungsbeschränkt)
Hans-Böckler-Str. 76
65199 Wiesbaden
Deutschland`}
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Vertreten durch: Vineet Talwar
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Kontakt
          <br />
          E-Mail:{" "}
          <a className="text-(--accent-warm) hover:underline" href="mailto:legal@goals.ac">
            legal@goals.ac
          </a>
          <br />
          Telefon:{" "}
          <a className="text-(--accent-warm) hover:underline" href="tel:+4917642904595">
            +49 176 42904595
          </a>
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Registereintrag: Eintragung im Handelsregister.
          <br />
          Registergericht: Amtsgericht Wiesbaden
          <br />
          Registernummer: HRB 36114
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Umsatzsteuer-ID gemäß § 27 a Umsatzsteuergesetz: USt-IdNr. -beantragt-
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line">
          {`Vineet Talwar
Hans-Böckler-Str. 76
65199 Wiesbaden`}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">EU-Online-Streitbeilegung (OS)</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            className="text-(--accent-warm) hover:underline break-all"
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Haftung für Inhalte</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
          jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
          oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst
          ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden
          von entsprechenden Rechtsverletzungen entfernen wir diese Inhalte umgehend.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Haftung für Links</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
          Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
          erkennbar.
        </p>
        <p className="text-sm text-white/65 leading-relaxed">
          Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
          Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
          werden wir derartige Links umgehend entfernen.
        </p>
      </section>
    </LegalPageClient>
  );
}
