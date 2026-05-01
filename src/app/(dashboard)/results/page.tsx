"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getFirestore, query } from "firebase/firestore";
import { motion } from "framer-motion";

import { useSimulationStore } from "@/store/simulation.store";
import { firebaseApp } from "@/lib/firebase";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import type { VoteRecord } from "@/types";
import { cn } from "@/lib/utils";

const ELECTION_ID = "demo-election";
const TOTAL_VOTERS = 5000;

export default function ResultsPage() {
  const { election, constituency, results, updateResults, setPhase } = useSimulationStore();
  const [votes, setVotes] = useState<VoteRecord[]>(results.votes?.length > 0 ? results.votes : []);
  const [loading, setLoading] = useState(results.votes?.length === 0);
  const [isCertifying, setIsCertifying] = useState(false);
  const [certified, setCertified] = useState(results.certified);

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
    try {
      // Generate Sheets
      const sheetRes = await fetch("/api/google/sheets/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          candidateCounts,
          winner
        }),
      });
      const sheetData = await sheetRes.json();

      // Generate Slides
      const slideRes = await fetch("/api/google/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          candidateCounts,
          winner
        }),
      });
      const slideData = await slideRes.json();

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
    return <div className="p-10 font-mono text-inkNavy">Tabulating final results...</div>;
  }

  return (
    <div className="flex h-screen bg-paperCream flex-col overflow-y-auto relative">
      <div className="max-w-4xl mx-auto w-full p-10 flex flex-col gap-10">
        <PageHeader 
          title="OFFICIAL ELECTION RESULTS" 
          subtitle={constituency.name.toUpperCase()}
          badge={certified ? { variant: "CERTIFIED", text: "ELECTION CERTIFIED" } : undefined}
        />

        {certified && (
          <div className="flex justify-center pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 z-50">
             <motion.div
               initial={{ scale: 3, opacity: 0, rotate: -15 }}
               animate={{ scale: 1, opacity: 1, rotate: -2 }}
               transition={{ type: "spring", stiffness: 200, damping: 15 }}
             >
               <StampBadge variant="CERTIFIED" text="ELECTION CERTIFIED" />
             </motion.div>
          </div>
        )}

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
    </div>
  );
}
