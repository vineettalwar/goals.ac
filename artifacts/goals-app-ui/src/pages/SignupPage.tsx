import { Link } from "react-router-dom";
import { AuthPageShell } from "@workspace/app-shell";

const CONTACT_EMAIL = "contact@goals.ac";
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

export function SignupPage() {
  return (
    <AuthPageShell>
      <div className="paper-card p-8 text-center">
        <h1 className="text-2xl font-bold">Private beta</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          goals.ac isn&apos;t open for self-serve signup yet. Email us for beta access —
          we&apos;ll send an invite when there&apos;s a seat.
        </p>
        <a
          href={CONTACT_MAILTO}
          className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Email {CONTACT_EMAIL}
        </a>
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
