"use client";

interface Props {
  isLoading: boolean;
  isError?: boolean;
  /** True when the query succeeded but produced nothing to show. */
  isEmpty?: boolean;
  error?: unknown;
  /** Re-run the failed query. When provided, the error state shows a Try-again button. */
  onRetry?: () => void;
  loadingLabel?: string;
  emptyLabel?: string;
  /** Compact variant for small inline regions (dropdowns, panels). */
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Centered({ compact, children }: { compact?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center text-fg-subtle ${
        compact ? "py-6 text-xs" : "py-12 text-sm"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * One place to render the loading / empty / error states for a React Query
 * result, so they can no longer be conflated. Previously many consumers gated on
 * `isLoading || !data`, which left failed and genuinely-empty queries stuck on a
 * "Loading…" message forever and offered no way to retry.
 */
export function QueryState({
  isLoading,
  isError,
  isEmpty,
  error,
  onRetry,
  loadingLabel = "Loading…",
  emptyLabel = "Nothing to show",
  compact,
  className = "",
  children,
}: Props) {
  if (isLoading) {
    return (
      <div className={className}>
        <Centered compact={compact}>
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
            aria-hidden
          />
          <span>{loadingLabel}</span>
        </Centered>
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error && error.message ? error.message : "Something went wrong.";
    return (
      <div className={className} role="alert">
        <Centered compact={compact}>
          <span className="font-medium text-fg-muted">Couldn’t load this</span>
          <span className="max-w-xs text-fg-subtle">{message}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Try again
            </button>
          )}
        </Centered>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={className}>
        <Centered compact={compact}>
          <span>{emptyLabel}</span>
        </Centered>
      </div>
    );
  }

  return <>{children}</>;
}
