"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SimulationState } from "@/types";

type SimulationStore = SimulationState & {
  /** Updates the current simulation phase (setup, registration, campaign, polling, results). */
  setPhase: (phase: SimulationState["phase"]) => void;
  /** Patches the constituency configuration including name, country, and map data. */
  updateConstituency: (update: Partial<SimulationState["constituency"]>) => void;
  /** Patches election metadata including milestones, candidates, and ballot info. */
  updateElection: (update: Partial<SimulationState["election"]>) => void;
  /** Patches real-time election results, including votes and disputes. */
  updateResults: (update: Partial<SimulationState["results"]>) => void;
  /** Resets the entire simulation store to the initial setup state. */
  resetSimulation: () => void;
};

const initialState: SimulationState = {
  phase: "setup",
  constituency: {
    name: "",
    country: "",
    bounds: { north: 0, south: 0, east: 0, west: 0 },
    pollingBooths: [],
    zones: [],
    voterRollUrl: "",
  },
  election: {
    calendarId: "",
    milestones: [],
    ballotFormId: "",
    candidates: [],
    languages: [],
  },
  results: {
    votes: [],
    disputes: [],
    certified: false,
    slidesUrl: "",
  },
};

/**
 * Main state management hook for the Civitas simulation.
 * Persists state to localStorage under the key 'civitas-simulation'.
 */
export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      ...initialState,
      setPhase: (phase) => set({ phase }),
      updateConstituency: (update) =>
        set((state) => ({
          constituency: { ...state.constituency, ...update },
        })),
      updateElection: (update) =>
        set((state) => ({
          election: { ...state.election, ...update },
        })),
      updateResults: (update) =>
        set((state) => ({
          results: { ...state.results, ...update },
        })),
      resetSimulation: () => set(initialState),
    }),
    {
      name: "civitas-simulation",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
