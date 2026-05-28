"use client";
// src/components/Providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { SessionTimeoutProvider } from "@/components/auth/SessionTimeoutProvider";
import { LanguageProvider } from "@/locales/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Cache for 1 minute before refetching on demand/refocus
            retry: 1,
            refetchOnWindowFocus: false, // Prevent query spam when refocusing window
          },
        },
      })
  );

  return (
    <SessionProvider>
      <LanguageProvider>
        <SessionTimeoutProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ToastContainer />
            {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </SessionTimeoutProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
