"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent hover:bg-accent-hover text-white",
  secondary: "bg-surface-raised hover:bg-surface-hover text-fg-muted hover:text-fg",
  ghost: "bg-transparent hover:bg-surface-hover text-fg-muted hover:text-fg",
  danger: "bg-red-600 hover:bg-red-500 text-white",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

/**
 * Shared button primitive. Consistent radius, focus ring, disabled state, and a
 * visible keyboard focus indicator (the codebase previously had zero focus rings
 * on buttons). Use instead of hand-rolled `<button className="px-… bg-…">`.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
});
