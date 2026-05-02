"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, getFirestore, updateDoc, doc } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

import { useSimulationStore } from "@/store/simulation.store";
import { firebaseApp } from "@/lib/firebase";
import { startSimulation, stopSimulation } from "@/lib/simulation";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import { BallotCounter } from "@/components/ui/BallotCounter";
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
import type { VoteRecord } from "@/types";
import { DisputeModal } from "@/components/ui/DisputeModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

const ELECTION_ID = "demo-election";
const TOTAL_VOTERS = 200;

export default function PollingPage() {
  const router = useRouter();
  const { election, constituency, results, updateResults } = useSimulationStore();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const simulationStarted = React.useRef(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Disputes
  const [pendingDispute, setPendingDispute] = useState<any>(null);
  const [disputeAdvisory, setDisputeAdvisory] = useState("");
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  // Gemini Advisor
  const [advisorMessages, setAdvisorMessages] = useState<GeminiMessage[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const pollingComplete = votes.length >= TOTAL_VOTERS;

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (simulationStarted.current) {
        stopSimulation();
      }
    };
  }, []);

  useEffect(() => {
    if (pollingComplete) {
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/results");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pollingComplete, router]);

  useEffect(() => {
    // Sub to Firestore
    const db = getFirestore(firebaseApp);
    const votesRef = collection(db, "elections", ELECTION_ID, "votes");
    const unsubVotes = onSnapshot(query(votesRef), (snapshot) => {
      const newVotes: VoteRecord[] = [];
      snapshot.forEach((doc) => {
        newVotes.push({ id: doc.id, ...doc.data() } as VoteRecord);
      });
      setVotes(newVotes);
    });

    // Sub to disputes
    const disputesRef = collection(db, "elections", ELECTION_ID, "disputes");
    const unsubDisputes = onSnapshot(query(disputesRef), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.status === "PENDING") {
            setPendingDispute({ id: change.doc.id, ...data });
          }
        }
      });
    });

    // Start simulation if we have candidates
    const candidates = useSimulationStore.getState().election.candidates;
    if (candidates.length > 0 && !simulationStarted.current) {
      simulationStarted.current = true;
      startSimulation(ELECTION_ID, candidates, TOTAL_VOTERS);
    }

    return () => {
      unsubVotes();
      unsubDisputes();
    };
  }, [election.candidates]);

  // Query Gemini for dispute
  useEffect(() => {
    if (pendingDispute && !disputeAdvisory && !advisoryLoading) {
      setAdvisoryLoading(true);
      fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Legal grounds for accepting or rejecting votes cast after polling station opened late in ${constituency.country}?`
            }
          ],
          context: { phase: "polling", constituency: constituency.name },
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          setDisputeAdvisory(data.content ?? data.error ?? "No advisory available.");
        })
        .catch(() => setDisputeAdvisory("Connection error."))
        .finally(() => setAdvisoryLoading(false));
    }
  }, [pendingDispute, disputeAdvisory, advisoryLoading, constituency.country, constituency.name]);

  const handleRuling = async (resolution: "ACCEPT" | "REJECT") => {
    if (!pendingDispute) return;

    const dispute = pendingDispute;
    setPendingDispute(null);
    setDisputeAdvisory("");

    // Update Firestore dispute status
    const db = getFirestore(firebaseApp);
    const docRef = doc(db, "elections", ELECTION_ID, "disputes", dispute.id);
    try {
      await Promise.race([
        updateDoc(docRef, { status: "RESOLVED", resolution }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
      ]);
    } catch (e) {
      console.error("Dispute update failed:", e);
    }

    // Adjust vote count in Zustand
    let adjustedVotes = [...votes];
    if (resolution === "REJECT") {
      let removed = 0;
      adjustedVotes = adjustedVotes.filter((v) => {
        if (v.zoneId === dispute.zone && removed < dispute.votesAffected) {
          removed++;
          return false;
        }
        return true;
      });
    }

    updateResults({
      votes: adjustedVotes,
      disputes: [
        ...results.disputes,
        {
          id: dispute.id,
          zoneId: dispute.zone,
          reason: dispute.reason,
          votesAffected: dispute.votesAffected,
          status: "RESOLVED",
          resolution,
        } as any,
      ],
    });
  };

  const handleAdvisorSend = async (msg: string) => {
    setAdvisorLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: msg }],
          context: { phase: "polling", constituency: constituency.name },
        }),
      });
      const data = await res.json();
      setAdvisorMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ref: data.advisoryRef,
          text: data.content ?? data.error ?? "No response",
        },
      ]);
    } catch (err) {
      setAdvisorMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: "Connection error." },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Derive stats
  const zones = ["Zone 1", "Zone 2", "Zone 3"];
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = { "Zone 1": 0, "Zone 2": 0, "Zone 3": 0 };
    votes.forEach((v) => {
      if (counts[v.zoneId] !== undefined) {
        counts[v.zoneId]++;
      }
    });
    return counts;
  }, [votes]);

  const candidateCounts = useMemo(() => {
    const counts = election.candidates.map((c) => ({
      ...c,
      votes: votes.filter((v) => v.candidateId === c.id).length,
    }));
    return counts.sort((a, b) => b.votes - a.votes);
  }, [votes, election.candidates]);

  const leadingCandidateId = candidateCounts.length > 0 && candidateCounts[0].votes > 0 ? candidateCounts[0].id : null;

  const chartData = useMemo(() => {
    return candidateCounts.map((c) => ({
      name: c.name,
      votes: c.votes,
      fill: c.id === leadingCandidateId ? "#C0392B" : "#1A1A2E", // official-red vs ink-navy
    }));
  }, [candidateCounts, leadingCandidateId]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-paperCream">
        {/* LEFT: Zone Status (25%) */}
        <aside className="w-1/4 shrink-0 border-r-2 border-inkNavy flex flex-col p-6 gap-6 overflow-y-auto">
          <h2 className="font-mono text-sm font-bold text-inkNavy uppercase tracking-widest border-b-2 border-inkNavy pb-2">
            Zone Status
          </h2>
          {zones.map((zone) => {
            const count = zoneCounts[zone];
            const expected = Math.floor(TOTAL_VOTERS / 3);
            const status = count === 0 ? "PENDING" : count >= expected ? "CERTIFIED" : "CLASSIFIED";
            const text = count === 0 ? "OPEN" : count >= expected ? "CLOSED" : "COUNTING";

            return (
              <OfficialCard key={zone} title={zone}>
                <div className="flex flex-col items-center gap-6 py-4">
                  <StampBadge variant={status as any} text={text} />
                  <BallotCounter current={count} total={expected} />
                </div>
              </OfficialCard>
            );
          })}
        </aside>

        {/* CENTRE: Live Count (50%) */}
        <main id="main" className="w-2/4 shrink-0 flex flex-col overflow-y-auto p-10 gap-10">
          <div className="flex items-center justify-between border-b-4 border-officialRed pb-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-inkNavy">POLLING DAY — LIVE COUNT</h1>
            </div>
            <div className="font-mono text-2xl font-bold text-inkNavy tracking-widest">
              {currentTime}
            </div>
          </div>

          {pollingComplete && (
            <div className="bg-inkNavy text-formWhite p-4 font-mono text-center animate-pulse">
              VOTING COMPLETE. Redirecting to results in {redirectCountdown}...
            </div>
          )}

          <div className="flex justify-center py-8">
            <BallotCounter current={votes.length} total={TOTAL_VOTERS} className="scale-125 transform" />
          </div>

          <OfficialCard title="Candidate Tally">
            <div className="flex flex-col gap-8">
              <BarChart
                width={600}
                height={288}
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666666" }} />
                <YAxis tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666666" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#F5F0E8", border: "2px solid #1A1A2E", borderRadius: 0, fontFamily: "monospace", fontSize: 12 }}
                  itemStyle={{ color: "#1A1A2E" }}
                  cursor={{ fill: "#1A1A2E", opacity: 0.05 }}
                />
                <Bar dataKey="votes" fill="#1A1A2E" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>

              <div className="flex flex-col gap-2">
                {candidateCounts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-ruleGray py-3">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg font-bold text-inkNavy">{c.name}</span>
                      <span className="font-mono text-xs text-midGray uppercase">{c.party}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      {c.id === leadingCandidateId && c.votes > 0 && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-officialRed flex items-center gap-1">
                          <span>▲</span> LEADING
                        </span>
                      )}
                      <span className="font-mono text-xl font-bold text-inkNavy min-w-[80px] text-right">
                        {c.votes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </OfficialCard>
        </main>

        {/* RIGHT: Gemini Advisor (25%) */}
        <aside className="w-1/4 shrink-0 border-l-2 border-inkNavy bg-formWhite overflow-hidden">
          <GeminiAdvisor
            onSend={handleAdvisorSend}
            messages={advisorMessages}
            loading={advisorLoading}
          />
        </aside>

      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory={disputeAdvisory}
        advisoryLoading={advisoryLoading}
        onRuling={handleRuling}
      />
      </div>
    </ErrorBoundary>
  );
}
