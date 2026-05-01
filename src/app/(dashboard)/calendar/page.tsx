"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { ElectionTimeline } from "@/components/ui/ElectionTimeline";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/types";

export default function CalendarPage() {
  const router = useRouter();
  const { constituency, election, updateElection } = useSimulationStore();

  const [milestones, setMilestones] = useState<Milestone[]>(election.milestones);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(!!election.calendarId);
  const [error, setError] = useState("");

  // ── Auto-generate on first load ────────────────────────────────────────────
  useEffect(() => {
    if (milestones.length > 0) return;
    if (!constituency.country) return;
    setGenerating(true);
    fetch("/api/google/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        country: constituency.country,
        electoralSystem:
          constituency.electoralSystemInfo?.system ?? "First Past the Post",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.milestones) {
          setMilestones(data.milestones);
          updateElection({ milestones: data.milestones });
        } else {
          setError(data.error ?? "Failed to generate timeline.");
        }
      })
      .catch(() => setError("Network error generating timeline."))
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync to Google Calendar ────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/google/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          milestones,
          constituencyName: constituency.name,
        }),
      });
      const data = await res.json();
      if (data.calendarId || data.mock) {
        updateElection({ calendarId: data.calendarId ?? "primary" });
        setSynced(true);
      } else {
        setError(data.error ?? "Calendar sync failed.");
      }
    } catch {
      setError("Network error syncing calendar.");
    } finally {
      setSyncing(false);
    }
  }, [milestones, constituency.name, updateElection]);

  const phaseLabels: Record<Milestone["phase"], string> = {
    registration: "Registration",
    campaign: "Campaign",
    polling: "Polling",
    results: "Results",
  };

  return (
    <div className="flex min-h-screen bg-paperCream">
      <Sidebar
        active="act2"
        lockedActs={[]}
        userName="Administrator"
        userRole="Returning Officer"
        avatarUrl=""
        onSignOut={() => router.push("/login")}
      />

      <main className="ml-60 flex-1 p-10">
        <PageHeader
          title="Election Calendar"
          subtitle={`${constituency.name || "Constituency"} · ${constituency.country}`}
          badge={{ variant: "PENDING", text: "ACT II" }}
        />

        {error && (
          <div className="mt-4 border-2 border-officialRed px-4 py-2">
            <p className="font-mono text-xs text-officialRed">{error}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-8">
          {/* ── Left: Timeline ─────────────────────────────────────────────── */}
          <div className="col-span-2">
            <OfficialCard title="Official Election Timeline" status={generating ? "default" : "active"}>
              {generating ? (
                <div className="py-12 text-center">
                  <p className="font-mono text-xs text-midGray uppercase tracking-widest">
                    Querying Gemini + Search Grounding for legal milestones…
                  </p>
                  <p className="font-mono text-[10px] text-midGray mt-2">
                    Fetching electoral law for {constituency.country}
                  </p>
                </div>
              ) : milestones.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-mono text-xs text-midGray">No milestones yet.</p>
                  <p className="font-mono text-[10px] text-midGray mt-1">
                    Ensure constituency country is set in Act I.
                  </p>
                </div>
              ) : (
                <ElectionTimeline milestones={milestones} />
              )}
            </OfficialCard>

            {/* Milestone table */}
            {milestones.length > 0 && (
              <div className="mt-6 border-2 border-inkNavy">
                <div className="flex h-10 items-center bg-inkNavy px-4">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-formWhite">
                    Milestone Reference Table
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-inkNavy">
                      <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-midGray">Date</th>
                      <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-midGray">Milestone</th>
                      <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-midGray">Phase</th>
                      <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-midGray">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m, i) => (
                      <tr
                        key={m.id ?? i}
                        className={cn(
                          "border-b border-ruleGray",
                          m.status === "current" && "bg-govGold/10"
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-inkNavy">{m.date}</td>
                        <td className="px-4 py-2">
                          <p className="font-mono text-xs font-bold text-inkNavy">{m.title}</p>
                          {m.description && (
                            <p className="font-mono text-[10px] text-midGray mt-0.5">{m.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-[10px] text-midGray uppercase">
                          {phaseLabels[m.phase]}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "font-mono text-[10px] uppercase font-bold",
                              m.status === "past" && "text-midGray",
                              m.status === "current" && "text-officialRed",
                              m.status === "future" && "text-inkNavy"
                            )}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Right: Calendar sync + Navigation ──────────────────────────── */}
          <div className="space-y-6">
            <OfficialCard title="Google Calendar Sync">
              <div className="space-y-4">
                <p className="font-mono text-xs text-midGray leading-relaxed">
                  Sync all {milestones.length} election milestones to your
                  Google Calendar account as official events.
                </p>

                {synced ? (
                  <div className="flex flex-col items-start gap-3">
                    <StampBadge variant="CERTIFIED" text="CALENDAR SYNCED" rotate={-1} />
                    <p className="font-mono text-[10px] text-midGray">
                      {milestones.length} events added to primary calendar.
                    </p>
                  </div>
                ) : (
                  <button
                    id="sync-calendar"
                    onClick={handleSync}
                    disabled={syncing || milestones.length === 0}
                    className={cn(
                      "w-full border-2 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-colors",
                      syncing || milestones.length === 0
                        ? "border-ruleGray text-midGray cursor-not-allowed"
                        : "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
                    )}
                  >
                    {syncing ? "Syncing…" : "Add to My Google Calendar →"}
                  </button>
                )}

                {election.calendarId && (
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="block font-mono text-[10px] text-govGold underline underline-offset-2"
                  >
                    Open Google Calendar ↗
                  </a>
                )}
              </div>
            </OfficialCard>

            <OfficialCard title="Electoral System">
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-midGray">System</p>
                <p className="font-mono text-xs font-bold text-inkNavy">
                  {constituency.electoralSystemInfo?.system ?? "—"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-midGray mt-2">Country</p>
                <p className="font-mono text-xs text-inkNavy">{constituency.country || "—"}</p>
              </div>
            </OfficialCard>

            <OfficialCard title="Next Steps">
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-midGray">Complete calendar sync, then register candidates.</p>
                <button
                  onClick={() => router.push("/ballot/candidates")}
                  className="w-full border-2 border-officialRed bg-officialRed py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-formWhite hover:bg-inkNavy hover:border-inkNavy transition-colors"
                >
                  Register Candidates →
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full border-2 border-inkNavy py-2 font-mono text-xs font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-colors"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </OfficialCard>
          </div>
        </div>
      </main>
    </div>
  );
}
