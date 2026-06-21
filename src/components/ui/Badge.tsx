"use client";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

interface Props {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-hover text-fg-muted",
  accent: "bg-accent/20 text-accent",
  success: "bg-emerald-500/20 text-emerald-300",
  warning: "bg-yellow-500/20 text-yellow-300",
  danger: "bg-red-500/20 text-red-300",
};

/** Small pill for counts, statuses, and labels. */
export function Badge({ tone = "neutral", className = "", children }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
