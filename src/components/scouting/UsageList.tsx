import { UsageOption } from "@/lib/competitive/types";

interface Props {
  label: string;
  options: UsageOption[];
  /** Optional cap on rows shown. */
  limit?: number;
  /** Emphasize (used for the Moves section). */
  emphasize?: boolean;
}

export function UsageList({ label, options, limit, emphasize = false }: Props) {
  const rows = limit ? options.slice(0, limit) : options;
  return (
    <div>
      <h4 className={`mb-0.5 text-2xs font-semibold uppercase tracking-wide ${emphasize ? "text-accent" : "text-fg-subtle"}`}>
        {label}
      </h4>
      {rows.length === 0 ? (
        <p className="text-2xs text-fg-subtle">—</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((o) => (
            <li key={o.name} className="flex items-baseline justify-between gap-1 text-2xs">
              <span className={`truncate ${emphasize ? "text-fg" : "text-fg-muted"}`}>{o.name}</span>
              <span className="shrink-0 tabular-nums text-fg-subtle">{Math.round(o.pct)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
