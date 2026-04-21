import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mastery3D, AffectiveState, EncounterRecord } from '@/types';

interface StudentStore {
  mastery: Record<string, Mastery3D>;
  affect: AffectiveState;
  history: EncounterRecord[];
  currentFocus: string | null;

  recordEncounter: (r: EncounterRecord) => void;
  setFocus: (id: string | null) => void;
  reset: () => void;
}

function initMastery(): Record<string, Mastery3D> {
  return {};
}

function initAffect(): AffectiveState {
  return { engagement: 0.7, confusion: 0.2, frustration: 0.1, boredom: 0.1, dominant: 'learning' };
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set, get) => ({
      mastery: initMastery(),
      affect: initAffect(),
      history: [],
      currentFocus: null,

      recordEncounter: (r) => {
        const s = get();
        const m = { ...s.mastery };
        const old = m[r.constructionId] || { alpha: 0.05, beta: 0, gamma: 0, lastEncounter: 0, encounterCount: 0, contextsUsed: [] };
        const contexts = old.contextsUsed.includes(r.contextId) ? old.contextsUsed : [...old.contextsUsed, r.contextId];
        m[r.constructionId] = {
          alpha: Math.min(0.95, Math.max(0.05, old.alpha + r.deltaAlpha)),
          beta: Math.min(0.95, Math.max(0, old.beta + r.deltaBeta)),
          gamma: contexts.length,
          lastEncounter: r.timestamp,
          encounterCount: old.encounterCount + 1,
          contextsUsed: contexts,
        };
        set({ mastery: m, history: [...s.history, r] });
      },

      setFocus: (id) => set({ currentFocus: id }),

      reset: () => set({ mastery: initMastery(), affect: initAffect(), history: [], currentFocus: null }),
    }),
    { name: 'eclm-student' },
  ),
);
