"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <p className="text-5xl font-bold text-destructive/20">Oops</p>
      <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground text-sm max-w-xs">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}
