"use client";

interface Props {
  className?: string;
  /** Round the placeholder fully (for circular sprites/avatars). */
  circle?: boolean;
}

/**
 * A single shimmering placeholder block. Compose several to mirror the shape of
 * content that's still loading. Sizing comes from `className` (width/height).
 */
export function Skeleton({ className = "", circle = false }: Props) {
  return <div className={`skeleton ${circle ? "rounded-full" : "rounded"} ${className}`} />;
}
