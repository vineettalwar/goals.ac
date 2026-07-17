"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

/**
 * Credentials sign-in via Auth.js server action.
 * Avoids next-auth/react client signIn, which refetches /api/auth/session after
 * callback and surfaces ClientFetchError in the Next.js browser overlay.
 */
export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<{ ok: boolean }> {
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (typeof result === "string" && /[?&]error=/.test(result)) {
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false };
    // NEXT_REDIRECT and other control-flow errors must propagate.
    throw error;
  }
}
