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
        // Fluid display steps. min/max are in rem so they scale with browser
        // zoom and user font-size; the vw term lets them breathe between. Use
        // these for prompt/heading/number displays instead of hard text-[Npx].
        "fluid-sm": ["clamp(0.8125rem, 0.78rem + 0.18vw, 0.9375rem)", { lineHeight: "1.4" }],
        "fluid-base": ["clamp(0.9375rem, 0.88rem + 0.3vw, 1.125rem)", { lineHeight: "1.45" }],
        "fluid-lg": ["clamp(1.0625rem, 0.95rem + 0.55vw, 1.375rem)", { lineHeight: "1.35" }],
        "fluid-xl": ["clamp(1.25rem, 1.05rem + 1vw, 1.875rem)", { lineHeight: "1.2" }],
        "fluid-2xl": ["clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem)", { lineHeight: "1.1" }],
      },
      spacing: {
        // Fluid gaps/padding for module chrome. Reused instead of ad-hoc px.
        fluid: "clamp(0.5rem, 0.4rem + 0.5vw, 1rem)",
        "fluid-lg": "clamp(0.75rem, 0.55rem + 1vw, 1.5rem)",
      },
    },
  },
  plugins: [require("@tailwindcss/container-queries")],
} satisfies Config;
