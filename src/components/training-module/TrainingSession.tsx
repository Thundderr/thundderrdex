"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTrainingStore } from "@/stores/trainingStore";
import { loadSetPool, type SetPool } from "@/lib/training/setPool";
import { TYPE_COLORS } from "@/data/typeChart";
import type { QuizMode, QuizQuestion, ExplainLink, ReviewChip, RichSegment } from "@/lib/training";

interface Props {
  mode: QuizMode;
  generation: number;
  onExit: () => void;
  onExplain: (link: ExplainLink) => void;
}

// Retries before declaring a mode can't build a question (e.g. sampled sets had
// no damaging move).
const MAX_GENERATE_TRIES = 16;

type Phase = "loading" | "error" | "ready";

export function TrainingSession({ mode, generation, onExit, onExplain }: Props) {
  const recordAnswer = useTrainingStore((s) => s.recordAnswer);
  const resetStreak = useTrainingStore((s) => s.resetStreak);
  const setModeSetting = useTrainingStore((s) => s.setModeSetting);
  const streak = useTrainingStore((s) => s.currentStreak[mode.id] ?? 0);
  const settings = useTrainingStore((s) => s.modeSettings[mode.id]);

  const [phase, setPhase] = useState<Phase>(mode.needsSetPool ? "loading" : "ready");
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [seen, setSeen] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const poolRef = useRef<SetPool | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Build the next question from the freshest SRS records + current settings.
  const nextQuestion = useCallback(() => {
    const ctx = {
      generation,
      records: useTrainingStore.getState().records,
      settings: useTrainingStore.getState().modeSettings[mode.id],
      rng: Math.random,
    };
    for (let i = 0; i < MAX_GENERATE_TRIES; i++) {
      const q = mode.generate(ctx, poolRef.current ?? undefined);
      if (q) {
        setQuestion(q);
        setPicked(null);
        return true;
      }
    }
    return false;
  }, [mode, generation]);

  // Session bootstrap: reset streak, load pool if needed, first question.
  useEffect(() => {
    let cancelled = false;
    resetStreak(mode.id);
    async function start() {
      if (mode.needsSetPool) {
        const pool = await loadSetPool(generation).catch(() => [] as SetPool);
        if (cancelled) return;
        poolRef.current = pool;
        if (pool.length < 2) {
          setPhase("error");
          return;
        }
      }
      if (cancelled) return;
      setPhase(nextQuestion() ? "ready" : "error");
    }
    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.id, generation]);

  // Keep focus on the container so number/Enter shortcuts work without hijacking
  // global keys (and without clashing across multiple Dojo cards).
  useEffect(() => {
    if (phase === "ready") rootRef.current?.focus();
  }, [phase, question]);

  const answered = picked !== null;
  const isCorrect = answered && question !== null && picked === question.correctChoiceId;

  const handlePick = useCallback(
    (choiceId: string) => {
      if (picked !== null || !question) return;
      setPicked(choiceId);
      const correct = choiceId === question.correctChoiceId;
      recordAnswer(mode.id, question.srsKey, correct);
      setSeen((n) => n + 1);
      if (correct) setCorrectCount((n) => n + 1);
    },
    [picked, question, recordAnswer, mode.id]
  );

  const handleNext = useCallback(() => {
    if (!nextQuestion()) setPhase("error");
  }, [nextQuestion]);

  const changeSetting = (key: string, value: string) => {
    setModeSetting(mode.id, key, value);
    // Apply immediately: discard the current question for a fresh one.
    setTimeout(() => setPhase(nextQuestion() ? "ready" : "error"), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onExit();
      return;
    }
    if (!question) return;
    if (!answered && /^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (idx < question.choices.length) {
        e.preventDefault();
        handlePick(question.choices[idx].id);
      }
    } else if (answered && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="flex min-h-[24rem] flex-col gap-3 outline-none"
    >
      {/* Header: back, settings, live stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onExit}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden>←</span> Dojo
        </button>
        <div className="flex items-center gap-3 text-center">
          <Stat label="Streak" value={String(streak)} />
          <Stat label="Seen" value={String(seen)} />
          <Stat label="Acc" value={seen ? `${Math.round((correctCount / seen) * 100)}%` : "—"} />
        </div>
      </div>

      {mode.settings && mode.settings.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {mode.settings.map((setting) => {
            const current = settings?.[setting.key] ?? setting.default;
            return (
              <div key={setting.key} className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-fg-subtle">{setting.label}</span>
                <div className="flex overflow-hidden rounded-md border border-line">
                  {setting.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => changeSetting(setting.key, opt.id)}
                      className={`px-2 py-1 text-2xs font-medium transition-colors ${
                        current === opt.id
                          ? "bg-indigo-600 text-white"
                          : "bg-surface-raised text-fg-muted hover:bg-surface-hover"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {phase === "loading" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-fg-muted">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-accent" />
            <p className="text-sm">Loading competitive sets…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-fg">Couldn&apos;t build a question.</p>
            <p className="mt-1 max-w-xs text-xs text-fg-subtle">
              Set data for Generation {generation} may be unavailable (check your connection) or this
              filter is too narrow. Try a different setting, generation, or mode.
            </p>
            <button
              onClick={onExit}
              className="mt-4 rounded-lg bg-surface-raised px-3 py-2 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              Back to Dojo
            </button>
          </div>
        )}

        {phase === "ready" && question && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-surface-raised p-4 text-center">
              <p className="text-lg font-semibold text-fg sm:text-xl">
                {question.promptRich ? (
                  <RichText segments={question.promptRich} chipClass="px-2 py-0.5 text-base" />
                ) : (
                  question.prompt
                )}
              </p>
              {question.subPrompt && <p className="mt-1.5 text-sm text-fg-muted">{question.subPrompt}</p>}
            </div>

            {question.choiceLayout === "row" ? (
              // Ordered scale (e.g. 0× … 4×): one intuitive left-to-right line.
              <div className="flex gap-2">
                {question.choices.map((choice, i) => (
                  <button
                    key={choice.id}
                    onClick={() => handlePick(choice.id)}
                    disabled={answered}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default ${choiceClass(
                      choice.id,
                      question.correctChoiceId,
                      picked,
                      answered
                    )}`}
                  >
                    <span>{choice.label}</span>
                    <span className="text-[9px] font-normal text-fg-subtle">{i + 1}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {question.choices.map((choice, i) => (
                  <button
                    key={choice.id}
                    onClick={() => handlePick(choice.id)}
                    disabled={answered}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default ${choiceClass(
                      choice.id,
                      question.correctChoiceId,
                      picked,
                      answered
                    )}`}
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-black/20 text-2xs text-fg-subtle">
                      {i + 1}
                    </span>
                    <span className="flex-1">{choice.label}</span>
                  </button>
                ))}
              </div>
            )}

            {answered && (
              <Feedback
                question={question}
                isCorrect={isCorrect}
                onNext={handleNext}
                onExplain={onExplain}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Colour an answer button by correctness once the question has been answered. */
function choiceClass(
  choiceId: string,
  correctId: string,
  picked: string | null,
  answered: boolean
): string {
  if (!answered) return "border-line bg-surface-raised hover:bg-surface-hover text-fg";
  if (choiceId === correctId) return "border-green-500/60 bg-green-500/15 text-green-200";
  if (choiceId === picked) return "border-red-500/60 bg-red-500/15 text-red-200";
  return "border-line bg-surface text-fg-subtle";
}

function Feedback({
  question,
  isCorrect,
  onNext,
  onExplain,
}: {
  question: QuizQuestion;
  isCorrect: boolean;
  onNext: () => void;
  onExplain: (link: ExplainLink) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised p-4">
      {/* Top row: verdict + breakdown on the left, action buttons in line on the right. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isCorrect ? "text-green-300" : "text-red-300"}`}>
            {isCorrect ? "Correct" : "Not quite"}
          </p>
          {question.explanationLines ? (
            <div className="mt-1 space-y-0.5 text-sm text-fg-muted">
              {question.explanationLines.map((line, i) => (
                <p key={i}>
                  <RichText segments={line} chipClass="px-1.5 py-0.5 text-2xs" />
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{question.explanation}</p>
          )}

          {question.breakdown && question.breakdown.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-md bg-surface p-2.5 font-mono text-2xs text-fg-muted">
              {question.breakdown.map((line, i) => (
                <li key={i} className="whitespace-pre-wrap break-words">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open Type Chart stacked above Next, top-aligned with the verdict. */}
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {question.explainLink && (
            <button
              onClick={() => onExplain(question.explainLink!)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {question.explainLink.label}
            </button>
          )}
          <button
            onClick={onNext}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Next <span className="font-normal opacity-80">(Enter)</span>
          </button>
        </div>
      </div>

      {/* Hints at the bottom: attacking-side on the left, defending-side on the right. */}
      {question.review && question.review.length > 0 && (
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <ReviewColumn sections={question.review.filter((s) => s.group !== "defense")} />
          <ReviewColumn sections={question.review.filter((s) => s.group === "defense")} />
        </div>
      )}
    </div>
  );
}

/** Render a rich text run, drawing `{ type }` tokens as coloured type badges. */
function RichText({ segments, chipClass }: { segments: RichSegment[]; chipClass?: string }) {
  return (
    <>
      {segments.map((seg, i) =>
        typeof seg === "string" ? (
          <span key={i}>{seg}</span>
        ) : (
          <span
            key={i}
            className={`mx-0.5 inline-block rounded align-middle font-semibold text-white ${
              chipClass ?? "px-1.5 py-0.5 text-2xs"
            }`}
            style={{ backgroundColor: TYPE_COLORS[seg.type] }}
          >
            {seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}
          </span>
        )
      )}
    </>
  );
}

function ReviewColumn({ sections }: { sections: QuizQuestion["review"] }) {
  if (!sections || sections.length === 0) return null;
  return (
    <div className="flex-1 space-y-3">
      {sections.map((section, i) => (
        <div key={i}>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            {section.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {section.chips.map((chip, j) => (
              <Chip key={j} chip={chip} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({ chip }: { chip: ReviewChip }) {
  if (chip.type) {
    return (
      <span
        className="rounded-md px-2.5 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: TYPE_COLORS[chip.type] }}
      >
        {chip.label}
      </span>
    );
  }
  const tone =
    chip.tone === "good"
      ? "bg-green-500/20 text-green-200"
      : chip.tone === "bad"
        ? "bg-red-500/20 text-red-200"
        : "bg-surface text-fg-muted";
  return <span className={`rounded-md px-2.5 py-1 text-sm font-medium ${tone}`}>{chip.label}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[2.5rem]">
      <p className="text-sm font-semibold text-fg">{value}</p>
      <p className="text-2xs uppercase tracking-wide text-fg-subtle">{label}</p>
    </div>
  );
}
