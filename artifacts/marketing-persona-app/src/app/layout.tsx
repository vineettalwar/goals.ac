"use client";

import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  }));

  return (
    <html lang="en" className={jakartaSans.variable}>
      <body>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="bottom-right" richColors />
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
