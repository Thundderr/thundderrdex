"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, useEffect } from "react";
import { createIDBPersister } from "@/lib/queryPersister";
import { SyncManager } from "@/components/auth/SyncManager";

// 7 days in milliseconds
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes before data is stale
            gcTime: SEVEN_DAYS, // Keep data for 7 days (must be >= maxAge for persistence)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [persister] = useState(() => createIDBPersister());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only use persistence on client side
  if (!isClient) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: SEVEN_DAYS, // Cache expires after 7 days
        buster: "v1", // Change this to invalidate all cached data
      }}
    >
      <SyncManager />
      {children}
    </PersistQueryClientProvider>
  );
}
