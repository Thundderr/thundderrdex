"use client";

import { Skeleton } from "@/components/ui";

/**
 * Loading placeholder that mirrors the structure of a loaded Pokémon (sprite +
 * name + types header, the tab strip, and the stats body) so switching to an
 * uncached Pokémon fades in smoothly instead of popping from a blank spinner.
 */
export function PokemonModuleSkeleton({ isExtended = false }: { isExtended?: boolean }) {
  const header = (
    <div className={`flex ${isExtended ? "flex-col items-center text-center" : "items-center"} gap-4 mb-4`}>
      <Skeleton className={isExtended ? "w-32 h-32" : "w-20 h-20"} />
      <div className={isExtended ? "flex flex-col items-center gap-2" : "space-y-2"}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );

  const tabs = (
    <div className="flex mb-4 border-b border-line">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-1 px-2 py-1.5">
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );

  // Mirrors the default Stats tab: a config row, then six stat rows + total.
  const statsBody = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
      </div>
      <div className="space-y-2 pt-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-10 shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-8 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={isExtended ? "flex gap-4" : ""} aria-busy="true" aria-label="Loading Pokémon">
      <div className={isExtended ? "w-48 flex-shrink-0" : ""}>{header}</div>
      <div className={isExtended ? "flex-1 min-w-0" : ""}>
        {tabs}
        {statsBody}
      </div>
    </div>
  );
}
