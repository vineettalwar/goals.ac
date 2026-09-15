"use server";

import { signIn } from "@/auth";

/** Google OAuth via Auth.js — existing accounts only (enforced in auth.ts signIn). */
export async function signInWithGoogle(redirectTo: string) {
  await signIn("google", { redirectTo });
}
