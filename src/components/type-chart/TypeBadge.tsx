"use client";

import { PokemonTypeName } from "@/types/pokemon";
import { TYPE_COLORS } from "@/data/typeChart";

interface Props {
  type: PokemonTypeName;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  fixedWidth?: boolean;
}

export function TypeBadge({ type, size = "sm", showLabel = true, fixedWidth = false }: Props) {
  const color = TYPE_COLORS[type];

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
  };

  // Fixed widths to accommodate longest type names ("Electric", "Fighting")
  const fixedWidthClasses = {
    xs: "min-w-[52px]",
    sm: "min-w-[64px]",
    md: "min-w-[80px]",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-medium uppercase tracking-wide ${sizeClasses[size]} ${fixedWidth ? fixedWidthClasses[size] : ""}`}
      style={{
        backgroundColor: color,
        color: getContrastColor(color),
      }}
    >
      {showLabel ? type : type.charAt(0).toUpperCase()}
    </span>
  );
}

function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
