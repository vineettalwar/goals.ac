import { redirect } from "next/navigation";

/**
 * Legacy standalone personas/topics page, replaced by the `topics` and
 * `voice_review` steps inside the Typeform onboarding shell. Kept reachable
 * per the PRD rather than deleted: it now hands off to the new flow, which
 * resumes each session at its own current step.
 */
export default function LegacyPersonasRedirect() {
  redirect("/onboarding");
}
