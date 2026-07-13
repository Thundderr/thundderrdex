import type { GenerationGames } from "@/data/generationGames";

// Near-white letters need a shadow to stay legible on the dark background.
const NEEDS_SHADOW = new Set(["#FAFAFA", "#D0D0D0"]);

export function GenLetters({ config }: { config: GenerationGames }) {
  return (
    <>
      {config.letters.map((letter, i) => (
        <span
          key={i}
          style={{
            color: letter.color,
            textShadow: NEEDS_SHADOW.has(letter.color) ? "0 0 2px rgba(0,0,0,0.8)" : "none",
          }}
        >
          {letter.char}
        </span>
      ))}
    </>
  );
}
