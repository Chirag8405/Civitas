"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import PageHeader from "@/components/layout/PageHeader";
import Sidebar from "@/components/layout/Sidebar";
import OfficialCard from "@/components/ui/OfficialCard";
import StampBadge from "@/components/ui/StampBadge";
import ElectionTimeline from "@/components/ui/ElectionTimeline";
import GeminiAdvisor from "@/components/ui/GeminiAdvisor";
import { cn } from "@/lib/utils";

type ActPhase =
  | "REPRESENTATION_OF_THE_PEOPLE"
  | "ELECTORAL_PROCESSES"
  | "BALLOT_MANAGEMENT"
  | "DISPUTE_RESOLUTION"
  | "RESULTS_CERTIFICATION";

const ACTS_PHASES: {
  id: ActPhase;
  title: string;
  description: string;
  status: "locked" | "active" | "completed";
}[] = [
  {
    id: "REPRESENTATION_OF_THE_PEOPLE",
    title: "Representation of the People",
    description: "Electoral rolls, voter registration, constituency boundaries",
    status: "active",
  },
  {
    id: "ELECTORAL_PROCESSES",
    title: "Electoral Processes",
    description: "Candidate nominations, campaign guidelines, polling schedule",
    status: "locked",
  },
  {
    id: "BALLOT_MANAGEMENT",
    title: "Ballot Management",
    description: "Ballot design, printing, distribution to polling booths",
    status: "locked",
  },
  {
    id: "DISPUTE_RESOLUTION",
    title: "Dispute Resolution",
    description: "Polling irregularities, election disputes, appeals process",
    status: "locked",
  },
  {
    id: "RESULTS_CERTIFICATION",
    title: "Results Certification",
    description: "Vote counting, result declaration, official notification",
    status: "locked",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { phase, constituency, setPhase } = useSimulationStore();
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [selectedAct, setSelectedAct] = useState<ActPhase | null>(null);

  const handleActSelect = useCallback((actId: ActPhase) => {
    const act = ACTS_PHASES.find((a) => a.id === actId);
    if (act?.status !== "locked") {
      setSelectedAct(actId);
    }
  }, []);

  const handlePhaseAdvance = useCallback(() => {
    const phases: typeof phase[] = [
      "setup",
      "calendar",
      "ballot",
      "polling",
      "results",
    ];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1] as any);
    }
  }, [phase, setPhase]);

  const lockedActs = ACTS_PHASES.filter(
    (a) => a.status === "locked"
  ).map((a) => a.id);

  return (
    <div className="flex min-h-screen bg-paperCream">
      <Sidebar
        active="dashboard"
        lockedActs={lockedActs}
        userName="Administrator"
        userRole="Election Officer"
        avatarUrl=""
        onSignOut={() => router.push("/login")}
      />

      <main className="ml-60 flex-1 p-12">
        <PageHeader
          title="Election Dashboard"
          subtitle={`Managing election in ${constituency.name || "your constituency"}`}
          badge={{ label: "PHASE", variant: "default" }}
        />

        <div className="mt-12 grid grid-cols-3 gap-8">
          {/* Left: Acts Cards */}
          <div className="col-span-2 space-y-6">
            <h3 className="font-serif text-xl font-bold text-inkNavy uppercase tracking-widest">
              Constitutional Acts
            </h3>

            {ACTS_PHASES.map((act) => {
              const isSelected = selectedAct === act.id;
              const isLocked = act.status === "locked";

              return (
                <OfficialCard
                  key={act.id}
                  onClick={() => handleActSelect(act.id)}
                  className={cn(
                    "p-6 cursor-pointer transition-colors",
                    isLocked ? "opacity-60 cursor-not-allowed" : "",
                    isSelected
                      ? "border-2 border-officialRed bg-formWhite"
                      : "border-2 border-ruleGray hover:border-govGold"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-inkNavy">
                        {act.title}
                      </h4>
                      <p className="font-mono text-xs text-midGray uppercase tracking-widest">
                        {act.id}
                      </p>
                    </div>
                    {isLocked ? (
                      <StampBadge label="LOCKED" variant="rejected" />
                    ) : act.status === "completed" ? (
                      <StampBadge label="COMPLETE" variant="accepted" />
                    ) : (
                      <StampBadge label="ACTIVE" variant="default" />
                    )}
                  </div>
                  <p className="font-mono text-sm text-midGray">
                    {act.description}
                  </p>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t-2 border-ruleGray">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhaseAdvance();
                        }}
                        className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest bg-officialRed text-formWhite border-2 border-officialRed hover:bg-govGold hover:text-inkNavy hover:border-govGold transition-colors"
                      >
                        Proceed with Act
                      </button>
                    </div>
                  )}
                </OfficialCard>
              );
            })}
          </div>

          {/* Right: Timeline and Advisor */}
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-xl font-bold text-inkNavy uppercase tracking-widest mb-4">
                Election Timeline
              </h3>
              <OfficialCard className="p-6">
                <ElectionTimeline
                  milestones={[
                    {
                      id: "1",
                      date: "2024-01-15",
                      title: "Nominations Open",
                      phase: "registration",
                      status: "past",
                    },
                    {
                      id: "2",
                      date: "2024-02-01",
                      title: "Campaign Period",
                      phase: "campaign",
                      status: "current",
                    },
                    {
                      id: "3",
                      date: "2024-02-15",
                      title: "Polling Day",
                      phase: "polling",
                      status: "future",
                    },
                    {
                      id: "4",
                      date: "2024-02-20",
                      title: "Results Declared",
                      phase: "results",
                      status: "future",
                    },
                  ]}
                />
              </OfficialCard>
            </div>

            {/* Advisor Toggle */}
            <div>
              <button
                onClick={() => setShowAdvisor(!showAdvisor)}
                className={cn(
                  "w-full px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest transition-colors",
                  showAdvisor
                    ? "bg-officialRed text-formWhite border-2 border-officialRed"
                    : "bg-formWhite text-inkNavy border-2 border-inkNavy hover:bg-govGold"
                )}
              >
                {showAdvisor ? "Close Advisor" : "Consult Advisor"}
              </button>
            </div>
          </div>
        </div>

        {/* Gemini Advisor Slide-in */}
        {showAdvisor && (
          <div className="fixed bottom-0 right-0 top-0 w-[400px] z-50">
            <GeminiAdvisor
              onClose={() => setShowAdvisor(false)}
              onMessage={async (message) => {
                console.log("User message:", message);
                // Will be connected to Gemini API route in Phase 2
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
