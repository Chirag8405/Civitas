import { getFirestore, collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { firebaseApp } from "./firebase";
import type { Candidate } from "@/types";
import { SIMULATION_INTERVAL_MS, DISPUTE_THRESHOLD } from "./constants";

let simulationInterval: NodeJS.Timeout | null = null;
let votesCast = 0;
let disputeTriggered = false;
let isRunning = false;

/**
 * Starts the vote simulation engine writing to Firestore in real-time.
 * @param userId - The election document ID in Firestore
 * @param candidates - Array of candidates to distribute votes across
 * @param totalVoters - Total number of votes to simulate
 */
export const startSimulation = async (userId: string, candidates: Candidate[], totalVoters: number) => {
  if (isRunning) return;
  isRunning = true;

  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  votesCast = 0;
  disputeTriggered = false;

  const db = getFirestore(firebaseApp);
  
  // Assign random popularity weights to candidates
  const weights = candidates.map(() => Math.random());
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map((w) => w / totalWeight);

  const pickCandidate = () => {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < candidates.length; i++) {
      sum += normalizedWeights[i];
      if (r <= sum) return candidates[i];
    }
    return candidates[candidates.length - 1];
  };

  const getZone = (currentVotes: number) => {
    if (currentVotes < totalVoters / 3) return "Zone 1";
    if (currentVotes < (2 * totalVoters) / 3) return "Zone 2";
    return "Zone 3";
  };

  simulationInterval = setInterval(async () => {
    if (votesCast >= totalVoters) {
      stopSimulation();
      return;
    }

    const batchSize = Math.min(Math.floor(Math.random() * 6) + 3, totalVoters - votesCast);
    if (batchSize <= 0) {
      stopSimulation();
      return;
    }
    const writeBatchDb = writeBatch(db);
    const votesRef = collection(db, "elections", userId, "votes");

    for (let i = 0; i < batchSize; i++) {
      const candidate = pickCandidate();
      const zone = getZone(votesCast + i);
      const voteDoc = doc(votesRef);
      writeBatchDb.set(voteDoc, {
        candidateId: candidate.id,
        zoneId: zone,
        timestamp: serverTimestamp(),
      });
    }

    votesCast += batchSize;

    if (votesCast >= totalVoters * DISPUTE_THRESHOLD && !disputeTriggered) {
      disputeTriggered = true;
      const disputesRef = collection(db, "elections", userId, "disputes");
      const disputeDoc = doc(disputesRef);
      writeBatchDb.set(disputeDoc, {
        zone: "Zone 3",
        reason: "Polling station opened late",
        votesAffected: 40,
        status: "PENDING",
        timestamp: serverTimestamp(),
      });
    }

    try {
      await writeBatchDb.commit();
      
      // Verify by reading back (quietly)
      const { getDocs } = await import("firebase/firestore");
      await getDocs(collection(db, "elections", userId, "votes"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error("[simulation] Firestore write failed:", message);
    }
  }, SIMULATION_INTERVAL_MS);

  // Init elections document
  const electionRef = doc(db, "elections", userId);
  const batch = writeBatch(db);
  batch.set(electionRef, { status: "polling", totalVoters }, { merge: true });
  try {
    await batch.commit();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error("[simulation] Init batch FAILED:", message);
  }
};

/**
 * Stops the active simulation interval and resets running state.
 */
export const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isRunning = false;
};
