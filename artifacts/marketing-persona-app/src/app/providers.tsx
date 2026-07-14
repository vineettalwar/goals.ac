"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { ThemeProvider } from "@/context/theme";

export function Providers({ children }: { children: React.ReactNode }) {
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
      })
  );

  return (
    <SessionProvider>
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
