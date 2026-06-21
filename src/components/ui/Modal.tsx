"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (used when there's no visible title element). */
  label?: string;
  /** id of the element labelling the dialog (overrides `label`). */
  labelledBy?: string;
  /** Max-width utility class for the panel. */
  size?: "sm" | "md" | "lg";
  /** Disable closing on backdrop click (e.g. destructive confirmations). */
  dismissOnBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" } as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell: role="dialog" + aria-modal, focus trap, focus restore,
 * Escape-to-close, and body scroll lock. Previously every overlay was a bare
 * `<div>` with no dialog semantics, no focus management, and a keyboard-inert
 * backdrop. Use for every modal/popover-dialog in the app.
 */
export function Modal({
  isOpen,
  onClose,
  label,
  labelledBy,
  size = "sm",
  dismissOnBackdrop = true,
  className = "",
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Save/restore focus and move focus into the dialog on open.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Escape to close + Tab focus trap.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop — a real button so the dismiss affordance is keyboard reachable. */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={dismissOnBackdrop ? onClose : undefined}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative z-10 w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto rounded-lg border border-line bg-surface-raised shadow-xl focus:outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
