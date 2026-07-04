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
            // PokéAPI rate-limits under load, so a single retry often isn't
            // enough; two retries with capped exponential backoff recovers most
            // transient failures before the user sees an error state.
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
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
        // Bump on any change to a cached query's SHAPE or CONTENTS that old
        // caches would miss. v2: PokedexEntry gained `catchKey`. v3: the
        // `pokemon-list` now includes the ~40 Pokémon Champions Megas — a stale
        // v2 cache (staleTime: Infinity) would never show them until busted.
        // v4: pokemon-list is now @pkmn/dex-derived (base names + alt forms) — old caches lack them.
        buster: "v4",
      }}
    >
      <SyncManager />
      {children}
    </PersistQueryClientProvider>
  );
}
