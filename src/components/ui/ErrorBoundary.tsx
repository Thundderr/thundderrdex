"use client";

import { Component, ReactNode } from "react";

interface Props {
  /** Shown when a child throws. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Contains render-time crashes so one broken module (or a malformed synced
 * payload applied into a store) can't white-screen the whole app. The app
 * previously had no error boundary anywhere.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="font-medium text-fg-muted">This panel hit an error.</p>
          <p className="max-w-md text-sm text-fg-subtle">{error.message}</p>
          <button
            onClick={this.reset}
            className="rounded-lg bg-surface-raised px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
