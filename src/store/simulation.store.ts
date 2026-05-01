"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SimulationState } from "@/types";

type SimulationStore = SimulationState & {
  setPhase: (phase: SimulationState["phase"]) => void;
  updateConstituency: (update: Partial<SimulationState["constituency"]>) => void;
  updateElection: (update: Partial<SimulationState["election"]>) => void;
  updateResults: (update: Partial<SimulationState["results"]>) => void;
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
