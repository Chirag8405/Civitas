"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import { ElectionTimeline } from "@/components/ui/ElectionTimeline";
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
import { cn } from "@/lib/utils";

type ActId = "ACT_1" | "ACT_2" | "ACT_3";
type NavItemKey = "overview" | "act1" | "act2" | "act3";

const ACT_NAV_KEY: Record<ActId, NavItemKey> = {
  ACT_1: "act1",
  ACT_2: "act2",
  ACT_3: "act3",
};

const ACT_ROUTES: Record<ActId, string> = {
  ACT_1: "/setup",
  ACT_2: "/calendar",
  ACT_3: "/polling",
};

const ACTS: {
  id: ActId;
  number: string;
  title: string;
  subtitle: string;
  tasks: string[];
}[] = [
  {
    id: "ACT_1",
    number: "ACT I",
    title: "Constituency Setup",
    subtitle: "Boundaries · Polling booths · Voter zones",
    tasks: [
      "Draw constituency boundary on map",
      "Place & name polling booths",
      "Configure voter zones",
      "Generate official voter roll",
    ],
  },
  {
    id: "ACT_2",
    number: "ACT II",
    title: "Election Calendar & Ballot",
    subtitle: "Milestones · Candidates · Ballot design",
    tasks: [
      "Create Google Calendar election timeline",
      "Register candidates via Google Forms",
      "Design & publish official ballot",
      "Configure translation for ballot languages",
    ],
  },
  {
    id: "ACT_3",
    number: "ACT III",
    title: "Polling Day & Results",
    subtitle: "Voting · Disputes · Declaration",
    tasks: [
      "Open polling and accept votes",
      "Resolve flagged disputes",
      "Generate results in Google Sheets",
      "Certify and publish official declaration",
    ],
  },
];

function deriveActStatus(
  phase: string,
  certified: boolean
): Record<ActId, "active" | "locked" | "certified"> {
  const act1Done = ["calendar", "ballot", "polling", "results"].includes(phase);
  const act2Done = ["polling", "results"].includes(phase);
  const act3Done = phase === "results" && certified;

  return {
    ACT_1: act1Done ? "certified" : "active",
    ACT_2: act1Done ? (act2Done ? "certified" : "active") : "locked",
    ACT_3: act2Done ? (act3Done ? "certified" : "active") : "locked",
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { phase, constituency, election, results } = useSimulationStore();
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<GeminiMessage[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const actStatus = deriveActStatus(phase, results.certified);

  const lockedNavKeys = (Object.keys(actStatus) as ActId[])
    .filter((id) => actStatus[id] === "locked")
    .map((id) => ACT_NAV_KEY[id] as NavItemKey);

  const handleEnterAct = useCallback(
    (actId: ActId) => {
      if (actStatus[actId] !== "locked") {
        router.push(ACT_ROUTES[actId]);
      }
    },
    [actStatus, router]
  );

  const handleAdvisorSend = useCallback(async (message: string) => {
    setAdvisorLoading(true);
    const userMsg: GeminiMessage = {
      id: Date.now().toString(),
      text: message,
    };
    setAdvisorMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          context: { phase, constituency: constituency.name },
        }),
      });
      const data = await res.json();
      const replyMsg: GeminiMessage = {
        id: (Date.now() + 1).toString(),
        ref: data.advisoryRef,
        text: data.content ?? data.error ?? "No response.",
      };
      setAdvisorMessages((prev) => [...prev, replyMsg]);
    } catch {
      setAdvisorMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: "Advisory service unavailable." },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  }, [phase, constituency.name]);

  return (
    <div className="flex min-h-screen bg-paperCream">
      <Sidebar
        active="overview"
        lockedActs={lockedNavKeys}
        userName="Administrator"
        userRole="Returning Officer"
        avatarUrl=""
        onSignOut={() => router.push("/login")}
      />

      <main className="ml-60 flex-1 p-12">
        <PageHeader
          title="Election Control Room"
          subtitle={`Returning Officer — ${constituency.name || "Constituency not configured"}`}
          badge={{ text: phase.toUpperCase(), variant: "PENDING" }}
        />

        <div className="mt-12 grid grid-cols-3 gap-8">
          {/* Left: 3 Act cards */}
          <div className="col-span-2 space-y-6">
            <p className="font-mono text-xs font-bold text-midGray uppercase tracking-widest">
              Election Acts — Sequential Progression
            </p>

            {ACTS.map((act) => {
              const status = actStatus[act.id];
              const isLocked = status === "locked";
              const isCertified = status === "certified";

              return (
                <OfficialCard
                  key={act.id}
                  title={`${act.number} · ${act.title}`}
                  status={!isLocked && !isCertified ? "active" : "default"}
                  className={cn(
                    isLocked ? "opacity-50" : "cursor-pointer"
                  )}
                >
                  <div
                    role={isLocked ? undefined : "button"}
                    tabIndex={isLocked ? -1 : 0}
                    onClick={() => handleEnterAct(act.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleEnterAct(act.id)}
                    className="outline-none"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        {/* Act number box */}
                        <div
                          className={cn(
                            "w-14 h-14 flex flex-col items-center justify-center border-2 shrink-0",
                            isLocked
                              ? "border-ruleGray text-midGray"
                              : isCertified
                              ? "border-govGold text-govGold"
                              : "border-officialRed text-officialRed"
                          )}
                        >
                          <span className="font-mono text-[9px] font-bold uppercase leading-none">
                            {act.number.split(" ")[0]}
                          </span>
                          <span className="font-serif text-xl font-bold leading-none">
                            {act.number.split(" ")[1]}
                          </span>
                        </div>

                        <div>
                          <p className="font-mono text-xs text-midGray">
                            {act.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Badge */}
                      <div className="shrink-0 ml-4">
                        {isLocked ? (
                          <div className="flex flex-col items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-midGray"
                              aria-label="Locked"
                            >
                              <rect x="3" y="11" width="18" height="11" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <StampBadge variant="REJECTED" text="LOCKED" />
                          </div>
                        ) : isCertified ? (
                          <StampBadge variant="CERTIFIED" />
                        ) : (
                          <StampBadge variant="PENDING" text="IN PROGRESS" />
                        )}
                      </div>
                    </div>

                    {/* Task list — only when unlocked */}
                    {!isLocked && (
                      <ul className="border-t-2 border-ruleGray pt-4 space-y-2">
                        {act.tasks.map((task, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 font-mono text-xs text-midGray"
                          >
                            <span
                              className={cn(
                                "w-4 h-4 border shrink-0 flex items-center justify-center",
                                isCertified
                                  ? "border-govGold text-govGold"
                                  : "border-ruleGray"
                              )}
                            >
                              {isCertified && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  aria-hidden="true"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA */}
                    {!isLocked && (
                      <div className="mt-5">
                        <button
                          id={`enter-${act.id.toLowerCase()}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnterAct(act.id);
                          }}
                          className={cn(
                            "px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border-2 transition-all active:scale-95",
                            isCertified
                              ? "border-govGold text-govGold hover:bg-govGold hover:text-inkNavy"
                              : "bg-officialRed text-formWhite border-officialRed hover:bg-inkNavy hover:border-inkNavy"
                          )}
                        >
                          {isCertified ? "Review Act" : "Enter Act →"}
                        </button>
                      </div>
                    )}
                  </div>
                </OfficialCard>
              );
            })}
          </div>

          {/* Right: Timeline + Progression + Advisor */}
          <div className="space-y-6">
            <OfficialCard title="Election Timeline">
              <ElectionTimeline
                milestones={
                  election.milestones.length > 0
                    ? election.milestones
                    : [
                        {
                          id: "1",
                          date: "—",
                          title: "Constituency Setup",
                          phase: "registration",
                          status:
                            actStatus.ACT_1 === "certified" ? "past" : "current",
                        },
                        {
                          id: "2",
                          date: "—",
                          title: "Calendar & Ballot",
                          phase: "campaign",
                          status:
                            actStatus.ACT_2 === "certified"
                              ? "past"
                              : actStatus.ACT_2 === "active"
                              ? "current"
                              : "future",
                        },
                        {
                          id: "3",
                          date: "—",
                          title: "Polling Day",
                          phase: "polling",
                          status:
                            actStatus.ACT_3 === "certified"
                              ? "past"
                              : actStatus.ACT_3 === "active"
                              ? "current"
                              : "future",
                        },
                        {
                          id: "4",
                          date: "—",
                          title: "Results Declared",
                          phase: "results",
                          status: results.certified ? "past" : "future",
                        },
                      ]
                }
              />
            </OfficialCard>

            <OfficialCard title="Progression Status">
              <div className="space-y-3">
                {ACTS.map((act) => {
                  const s = actStatus[act.id];
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-xs text-inkNavy">
                        {act.number}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase font-bold",
                          s === "locked" && "text-midGray",
                          s === "active" && "text-officialRed",
                          s === "certified" && "text-govGold"
                        )}
                      >
                        {s === "locked"
                          ? "Locked"
                          : s === "certified"
                          ? "✓ Certified"
                          : "In Progress"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </OfficialCard>

            {/* Advisor toggle */}
            <button
              id="advisor-toggle"
              onClick={() => setAdvisorOpen(!advisorOpen)}
              className={cn(
                "w-full px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest border-2 transition-all active:scale-95",
                advisorOpen
                  ? "bg-officialRed text-formWhite border-officialRed"
                  : "bg-formWhite text-inkNavy border-inkNavy hover:bg-govGold hover:border-govGold"
              )}
            >
              {advisorOpen ? "Close Advisor" : "Consult Chief Advisor"}
            </button>
          </div>
        </div>
      </main>

      {/* Gemini Advisor slide-in */}
      {advisorOpen && (
        <div className="fixed bottom-0 right-0 top-0 w-[400px] z-50">
          <GeminiAdvisor
            onSend={handleAdvisorSend}
            messages={advisorMessages}
            loading={advisorLoading}
          />
        </div>
      )}
    </div>
  );
}
