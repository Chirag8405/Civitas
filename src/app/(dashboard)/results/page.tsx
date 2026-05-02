"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { collection, getDocs, getFirestore, query } from "firebase/firestore";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";

import { useSimulationStore } from "@/store/simulation.store";
import { firebaseApp } from "@/lib/firebase";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import type { VoteRecord } from "@/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

const ELECTION_ID = "demo-election";
const TOTAL_VOTERS = 5000;

export default function ResultsPage() {
  const { election, constituency, results, updateResults, setPhase } = useSimulationStore();
  const [votes, setVotes] = useState<VoteRecord[]>(results.votes?.length > 0 ? results.votes : []);
  const [loading, setLoading] = useState(results.votes?.length === 0);
  const [isCertifying, setIsCertifying] = useState(false);
  const [certified, setCertified] = useState(results.certified);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If votes aren't in Zustand, fetch from Firestore
    if (results.votes && results.votes.length > 0) {
      setLoading(false);
      return;
    }

    const fetchVotes = async () => {
      const db = getFirestore(firebaseApp);
      const votesRef = collection(db, "elections", ELECTION_ID, "votes");
      const snap = await getDocs(query(votesRef));
      const fetchedVotes: VoteRecord[] = [];
      snap.forEach((doc) => fetchedVotes.push({ id: doc.id, ...doc.data() } as VoteRecord));
      
      // We must apply dispute resolution if it exists in Zustand but wasn't applied to Firestore
      let finalVotes = fetchedVotes;
      results.disputes.forEach((d) => {
        if (d.status === "RESOLVED" && d.resolution === "REJECT") {
          let removed = 0;
          finalVotes = finalVotes.filter((v) => {
            if (v.zoneId === d.zoneId && removed < d.votesAffected) {
              removed++;
              return false;
            }
            return true;
          });
        }
      });
      setVotes(finalVotes);
      setLoading(false);
    };
    fetchVotes();
  }, [results.votes, results.disputes]);

  const candidateCounts = useMemo(() => {
    const counts = election.candidates.map((c) => ({
      ...c,
      votes: votes.filter((v) => v.candidateId === c.id).length,
    }));
    return counts.sort((a, b) => b.votes - a.votes);
  }, [votes, election.candidates]);

  const winner = candidateCounts.length > 0 ? candidateCounts[0] : null;
  const turnout = TOTAL_VOTERS > 0 ? ((votes.length / TOTAL_VOTERS) * 100).toFixed(1) : "0.0";

  const handleCertify = async () => {
    setIsCertifying(true);

    // Fresh data from store
    const { constituency, election, results } = useSimulationStore.getState();
    const storeCandidateCounts = election.candidates.map(c => ({
      id: c.id,
      name: c.name,
      party: c.party,
      votes: results.votes.filter(v => v.candidateId === c.id).length
    })).sort((a, b) => b.votes - a.votes);

    const storeWinner = storeCandidateCounts[0] ?? null;

    try {
      // Generate Sheets
      const sheetRes = await fetch("/api/google/sheets/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          candidateCounts: storeCandidateCounts,
          winner: storeWinner,
        }),
      });
      const sheetData = await sheetRes.json();
      setSheetUrl(sheetData.sheetUrl);

      // Generate Slides
      const slideRes = await fetch("/api/google/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          candidateCounts: storeCandidateCounts,
          winner: storeWinner,
        }),
      });
      const slideData = await slideRes.json();

      // Confetti effect
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#F5F0E8", "#1A1A2E", "#C0392B"]
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#F5F0E8", "#1A1A2E", "#C0392B"]
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      setCertified(true);
      updateResults({ certified: true, slidesUrl: slideData.slidesUrl });
      setPhase("results");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCertifying(false);
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="p-10 font-mono text-inkNavy">Tabulating final results...</div>
      </ErrorBoundary>
    );
  }

  if (certified) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col items-center justify-start min-h-screen bg-paperCream p-12 text-center gap-10 relative overflow-y-auto w-full">
          <h1 
            style={{ fontFamily: 'var(--font-display)' }} 
            className="text-5xl md:text-6xl font-bold text-inkNavy mt-8"
          >
            ELECTION DECLARED
          </h1>
          
          {winner && (
            <div className="flex flex-col items-center gap-4 z-10">
              <h2 
                style={{ fontFamily: 'var(--font-display)' }} 
                className="text-4xl md:text-5xl font-bold text-inkNavy border-b-4 border-govGold pb-2"
              >
                {winner.name}
              </h2>
              <p className="font-mono text-xl text-midGray uppercase tracking-widest">{winner.party}</p>
            </div>
          )}

          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="z-10 my-4"
          >
            <div className="scale-150 origin-center">
              <StampBadge variant="CERTIFIED" text="ELECTION CERTIFIED" />
            </div>
          </motion.div>

          {results.slidesUrl && (
            <div className="w-full max-w-4xl aspect-video border-4 border-inkNavy shadow-xl z-10 bg-formWhite">
              <iframe 
                src={results.slidesUrl.replace("/edit", "/embed")} 
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          )}

          <div className="flex gap-6 z-10 mt-8 pb-16">
            {sheetUrl && (
              <a 
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-inkNavy text-formWhite font-mono font-bold text-lg uppercase tracking-widest transition-colors hover:bg-gray-800"
              >
                Download Results →
              </a>
            )}
            <button
              onClick={() => {
                useSimulationStore.getState().resetSimulation();
                router.push("/dashboard");
              }}
              className="px-8 py-4 bg-govGold text-inkNavy font-mono font-bold text-lg uppercase tracking-widest transition-colors hover:bg-yellow-600"
            >
              Start New Election →
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <main id="main" className="flex h-screen bg-paperCream flex-col overflow-y-auto relative">
        <div className="max-w-4xl mx-auto w-full p-10 flex flex-col gap-10">
          <PageHeader 
            title="OFFICIAL ELECTION RESULTS" 
            subtitle={constituency.name.toUpperCase()}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <OfficialCard title="Turnout" className="flex flex-col items-center justify-center p-8">
              <div className="text-5xl font-mono font-bold text-inkNavy">{turnout}%</div>
              <div className="text-sm font-mono text-midGray mt-2">{votes.length.toLocaleString()} / {TOTAL_VOTERS.toLocaleString()} Votes</div>
            </OfficialCard>

            {winner && (
              <div className="md:col-span-2 border-4 border-govGold bg-formWhite p-8 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 left-0 bg-govGold text-inkNavy text-xs font-mono font-bold px-3 py-1 uppercase tracking-widest">
                  Elected Representative
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-4xl font-bold text-inkNavy">
                      {winner.name}
                    </h2>
                    <p className="font-mono text-midGray uppercase mt-2">{winner.party}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-inkNavy">{winner.votes.toLocaleString()}</div>
                    <div className="text-xs font-mono text-midGray uppercase mt-1">Total Votes</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <OfficialCard title="Candidate Totals" className="relative z-10">
             <table className="w-full text-left font-mono text-sm text-inkNavy border-collapse">
               <thead>
                 <tr className="border-b-2 border-inkNavy">
                   <th className="py-3 px-4">Candidate</th>
                   <th className="py-3 px-4">Party</th>
                   <th className="py-3 px-4 text-right">Votes</th>
                   <th className="py-3 px-4 text-right">%</th>
                 </tr>
               </thead>
               <tbody>
                 {candidateCounts.map((c) => (
                   <tr key={c.id} className="border-b border-ruleGray last:border-0">
                     <td className="py-4 px-4 font-bold">{c.name}</td>
                     <td className="py-4 px-4 text-midGray">{c.party}</td>
                     <td className="py-4 px-4 text-right font-bold">{c.votes.toLocaleString()}</td>
                     <td className="py-4 px-4 text-right text-midGray">
                       {votes.length > 0 ? ((c.votes / votes.length) * 100).toFixed(1) : "0.0"}%
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </OfficialCard>

          {results.disputes.length > 0 && (
            <OfficialCard title="Dispute Outcomes" className="border-t-4 border-t-officialRed relative z-10">
              <div className="flex flex-col gap-4 p-2">
                {results.disputes.map((d: any) => (
                  <div key={d.id} className="p-4 bg-stampRedBg/20 border-l-4 border-officialRed flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-inkNavy">{d.reason}</div>
                      <div className="font-mono text-xs text-midGray mt-1">Zone: {d.zoneId} | Votes Affected: {d.votesAffected}</div>
                    </div>
                    <StampBadge variant={d.resolution === "REJECT" ? "REJECTED" : "CERTIFIED"} text={d.resolution} />
                  </div>
                ))}
              </div>
            </OfficialCard>
          )}

          <div className="flex justify-end pt-8 pb-16 relative z-10">
            <button
              onClick={handleCertify}
              disabled={certified || isCertifying}
              className={cn(
                "px-8 py-4 font-mono font-bold text-lg uppercase tracking-widest transition-colors",
                certified 
                  ? "bg-midGray text-formWhite cursor-not-allowed" 
                  : "bg-govGold text-inkNavy hover:bg-yellow-600"
              )}
            >
              {isCertifying ? "Certifying..." : certified ? "Count Certified" : "Certify The Count →"}
            </button>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
