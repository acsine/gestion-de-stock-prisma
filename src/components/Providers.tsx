"use client";
// src/components/Providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { SessionTimeoutProvider } from "@/components/auth/SessionTimeoutProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchInterval: 10 * 1000, // Refresh every 10 seconds
            refetchIntervalInBackground: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <SessionTimeoutProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ToastContainer />
          {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </SessionTimeoutProvider>
    </SessionProvider>
  );
}
