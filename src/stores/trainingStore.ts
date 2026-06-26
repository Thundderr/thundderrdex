import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyResult,
  emptyModeStats,
  type ModeStats,
  type SrsRecord,
} from "@/lib/training/srs";

// Bump when the persisted shape changes. Exported so a future sync registry
// entry can reuse it (see note below).
export const TRAINING_STORE_VERSION = 0;

// Matchup-based facts (KO / speed) have an effectively unbounded key space, so
// cap the records map and evict least-recently-seen entries. Keeps the payload
// small — and well under the 1MB cloud-sync limit when sync is enabled later.
const MAX_RECORDS = 5000;

interface TrainingState {
  /** SRS state per fact, keyed by `srsKey`. */
  records: Record<string, SrsRecord>;
  /** Lifetime aggregates per mode id. */
  modeStats: Record<string, ModeStats>;
  /** Running (session) streak per mode id. */
  currentStreak: Record<string, number>;
  /** Selected practice settings per mode id: { [modeId]: { [settingKey]: optionId } }. */
  modeSettings: Record<string, Record<string, string>>;

  recordAnswer: (modeId: string, srsKey: string, correct: boolean) => void;
  resetStreak: (modeId: string) => void;
  setModeSetting: (modeId: string, key: string, value: string) => void;
  resetMode: (modeId: string) => void;
  resetAll: () => void;
}

// SRS-key namespace each mode writes under, so resetMode can drop exactly its facts.
const MODE_KEY_PREFIX: Record<string, string> = {
  "type-eff": "type-eff:",
  nature: "nature:",
  speed: "speed:",
  "will-it-ko": "ko:",
};

function pruneRecords(records: Record<string, SrsRecord>): Record<string, SrsRecord> {
  const keys = Object.keys(records);
  if (keys.length <= MAX_RECORDS) return records;
  // Keep the most-recently-seen MAX_RECORDS entries.
  const kept = keys
    .sort((a, b) => records[b].lastSeenAt - records[a].lastSeenAt)
    .slice(0, MAX_RECORDS);
  const next: Record<string, SrsRecord> = {};
  for (const k of kept) next[k] = records[k];
  return next;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      records: {},
      modeStats: {},
      currentStreak: {},
      modeSettings: {},

      recordAnswer: (modeId, srsKey, correct) => {
        set((state) => {
          const now = Date.now();
          const records = pruneRecords({
            ...state.records,
            [srsKey]: applyResult(state.records[srsKey], correct, now),
          });

          const prevStats = state.modeStats[modeId] ?? emptyModeStats();
          const streak = correct ? (state.currentStreak[modeId] ?? 0) + 1 : 0;
          const modeStats: ModeStats = {
            attempts: prevStats.attempts + 1,
            correct: prevStats.correct + (correct ? 1 : 0),
            bestStreak: Math.max(prevStats.bestStreak, streak),
          };

          return {
            records,
            modeStats: { ...state.modeStats, [modeId]: modeStats },
            currentStreak: { ...state.currentStreak, [modeId]: streak },
          };
        });
      },

      resetStreak: (modeId) => {
        set((state) => ({ currentStreak: { ...state.currentStreak, [modeId]: 0 } }));
      },

      setModeSetting: (modeId, key, value) => {
        set((state) => ({
          modeSettings: {
            ...state.modeSettings,
            [modeId]: { ...state.modeSettings[modeId], [key]: value },
          },
        }));
      },

      resetMode: (modeId) => {
        set((state) => {
          // Drop SRS records for this mode (keys are prefixed by the mode's
          // fact namespace) and clear its aggregates.
          const prefix = MODE_KEY_PREFIX[modeId];
          const records: Record<string, SrsRecord> = {};
          for (const [k, v] of Object.entries(state.records)) {
            if (!prefix || !k.startsWith(prefix)) records[k] = v;
          }
          const modeStats = { ...state.modeStats };
          delete modeStats[modeId];
          const currentStreak = { ...state.currentStreak };
          delete currentStreak[modeId];
          return { records, modeStats, currentStreak };
        });
      },

      resetAll: () => set({ records: {}, modeStats: {}, currentStreak: {}, modeSettings: {} }),
    }),
    {
      name: "thundderrdex-training",
      version: TRAINING_STORE_VERSION,
      // currentStreak is session-scoped; only persist durable progress + prefs.
      partialize: (s) => ({
        records: s.records,
        modeStats: s.modeStats,
        modeSettings: s.modeSettings,
      }),
    }
  )
);
