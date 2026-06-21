"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-app p-8 text-center">
      <h1 className="text-xl font-bold text-fg">Something went wrong</h1>
      <p className="max-w-md text-sm text-fg-subtle">
        {error.message || "An unexpected error occurred. Your saved data is safe."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app"
      >
        Reload the app
      </button>
    </div>
  );
}
