"use client";

import { useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { GoalsBrandMark } from "../brand-mark";

export type AuthMode = "login" | "signup";

export type AuthLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

const OUTLINE_BUTTON_CLASS =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted/50";

function subscribeNoop() {
  return () => {};
}

/** False on SSR + first client paint; true after hydrate — avoids PW-manager DOM injection mismatches. */
function useHydrated() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const MODE_COPY: Record<
  AuthMode,
  { title: string; subtitle: string; submitLabel: string; submittingLabel: string }
> = {
  login: {
    title: "Sign in",
    subtitle: "Welcome back",
    submitLabel: "Sign in",
    submittingLabel: "Signing in…",
  },
  signup: {
    title: "Create account",
    subtitle: "Create your goals.ac account to get started.",
    submitLabel: "Create account",
    submittingLabel: "Creating account…",
  },
};

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <GoalsBrandMark size={28} className="text-primary" />
        <span className="text-lg font-semibold tracking-tight">goals.ac</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export function AuthView({
  mode,
  name,
  email,
  password,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  error,
  submitting,
  onSubmit,
  forgotPasswordHref,
  googleSignInHref,
  renderLink,
  renderForgotPasswordLink,
}: {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
  forgotPasswordHref?: string;
  googleSignInHref?: string;
  renderLink: (props: AuthLinkProps) => ReactNode;
  renderForgotPasswordLink?: (props: AuthLinkProps) => ReactNode;
}) {
  const copy = MODE_COPY[mode];
  // Password managers inject attrs/nodes before hydrate; mount fields after.
  const hydrated = useHydrated();

  return (
    <div className="paper-card p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {googleSignInHref ? (
        <>
          <a href={googleSignInHref} className={OUTLINE_BUTTON_CLASS}>
            <GoogleIcon />
            Continue with Google
          </a>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-2">or</span>
            </div>
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {mode === "signup" ? (
          <div className="space-y-1.5">
            <label htmlFor="auth-name" className="text-sm font-medium">
              Full name
            </label>
            {hydrated ? (
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Alex Johnson"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className={INPUT_CLASS}
              />
            ) : (
              <div className={`${INPUT_CLASS} h-10`} aria-hidden />
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium">
            Email
          </label>
          {hydrated ? (
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className={INPUT_CLASS}
            />
          ) : (
            <div className={`${INPUT_CLASS} h-10`} aria-hidden />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password
            </label>
            {mode === "login" && forgotPasswordHref ? (
              renderForgotPasswordLink ? (
                renderForgotPasswordLink({
                  href: forgotPasswordHref,
                  className: "text-xs text-muted-foreground hover:text-foreground",
                  children: "Forgot password?",
                })
              ) : (
                <a
                  href={forgotPasswordHref}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </a>
              )
            ) : null}
          </div>
          {hydrated ? (
            <input
              id="auth-password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className={INPUT_CLASS}
            />
          ) : (
            <div className={`${INPUT_CLASS} h-10`} aria-hidden />
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !hydrated}
          aria-busy={submitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? copy.submittingLabel : copy.submitLabel}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            {renderLink({
              href: "/login",
              className: "font-medium text-foreground hover:underline",
              children: "Sign in",
            })}
          </>
        ) : (
          <>
            New here?{" "}
            {renderLink({
              href: "/signup",
              className: "font-medium text-foreground hover:underline",
              children: "Create an account",
            })}
          </>
        )}
      </p>
    </div>
  );
}
