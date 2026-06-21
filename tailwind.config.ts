import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Accent class strings (e.g. bg-cyan-600) live here; without this glob
    // Tailwind purges any colour only referenced from lib (e.g. type/nature).
    "./src/lib/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Back-compat aliases (unused historically but kept to avoid surprises).
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Semantic tokens. Default slate/blue/etc. remain available since this
        // only extends the palette — existing utility classes keep working.
        app: token("--color-app"),
        surface: {
          DEFAULT: token("--color-surface"),
          raised: token("--color-surface-raised"),
          hover: token("--color-surface-hover"),
        },
        line: {
          DEFAULT: token("--color-line"),
          subtle: token("--color-line-subtle"),
        },
        fg: {
          DEFAULT: token("--color-fg"),
          muted: token("--color-fg-muted"),
          subtle: token("--color-fg-subtle"),
        },
        accent: {
          DEFAULT: token("--color-accent"),
          hover: token("--color-accent-hover"),
        },
      },
      fontSize: {
        // Readable floor: replaces ad-hoc text-[8px]/[9px] usages.
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
