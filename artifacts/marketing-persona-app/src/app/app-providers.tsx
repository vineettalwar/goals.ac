"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { WebVitalsReporter } from "@/components/app/web-vitals-reporter";
import { ThemeProvider } from "@/context/theme";

export type AppProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export function AppProviders({ children, session = null }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider
      session={session}
      // Server already hydrates session; focus refetch hits /api/auth/session and
      // surfaces ClientFetchError in the overlay when the dev server is wedged.
      refetchOnWindowFocus={false}
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <WebVitalsReporter />
          <Toaster position="bottom-right" richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
