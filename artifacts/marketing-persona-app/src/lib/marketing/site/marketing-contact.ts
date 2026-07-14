/** Client-safe marketing contact and CTA constants (no server/database imports). */

import { getAppOrigin, loginHref, signupHref, goToSignup } from "@/lib/marketing/site/app-url";

export { loginHref, signupHref, goToSignup };

export const CONTACT_EMAIL = "contact@goals.ac";
export const CONTACT_HREF = "/contact";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

/** Product app login — stage-aware; prefer useAppAuthHrefs() in client nav. */
export const LOGIN_HREF = loginHref();

/** Product app signup — stage-aware. */
export const SIGNUP_HREF = signupHref();

export const CONTENT_STUDIO_HREF = "/content-engine";

/** Default primary CTA across marketing pages */
export const PRODUCT_CTA_PRIMARY = "Start creating";
export const PRODUCT_CTA_HREF = SIGNUP_HREF;

/** Default secondary CTA — product tour without signup */
export const PRODUCT_CTA_SECONDARY = "See the content studio";
export const PRODUCT_CTA_SECONDARY_HREF = CONTENT_STUDIO_HREF;

/** Contact / enterprise — use on the contact page and as a tertiary link */
export const CONTACT_CTA_LABEL = "Talk to us";

/** @deprecated use getAppOrigin() */
export function appOrigin(): string {
  return getAppOrigin();
}
