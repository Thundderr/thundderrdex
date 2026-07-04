"use client";

interface Props {
  showFemale: boolean;
  onToggle: (showFemale: boolean) => void;
}

/** Small ♂/♀ segmented control. */
export function GenderToggle({ showFemale, onToggle }: Props) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-line text-2xs">
      <button
        onClick={() => onToggle(false)}
        aria-pressed={!showFemale}
        className={`px-1.5 py-0.5 ${!showFemale ? "bg-blue-600 text-white" : "text-fg-subtle hover:bg-surface-hover"}`}
      >
        ♂
      </button>
      <button
        onClick={() => onToggle(true)}
        aria-pressed={showFemale}
        className={`px-1.5 py-0.5 ${showFemale ? "bg-pink-600 text-white" : "text-fg-subtle hover:bg-surface-hover"}`}
      >
        ♀
      </button>
    </div>
  );
}
