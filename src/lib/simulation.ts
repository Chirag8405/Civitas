import { getFirestore, collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { firebaseApp } from "./firebase";
import type { Candidate } from "@/types";

let simulationInterval: NodeJS.Timeout | null = null;
let votesCast = 0;
let disputeTriggered = false;

export const startSimulation = async (userId: string, candidates: Candidate[], totalVoters: number) => {
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

  console.log("About to start setInterval");
  simulationInterval = setInterval(async () => {
    console.log("Interval tick firing");
    if (votesCast >= totalVoters) {
      stopSimulation();
      return;
    }

    const batchSize = Math.min(Math.floor(Math.random() * 6) + 3, totalVoters - votesCast);
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

    if (votesCast >= totalVoters * 0.6 && !disputeTriggered) {
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

    console.log("Simulation tick — writing", batchSize, "votes, total so far:", votesCast);
    try {
      await writeBatchDb.commit();
      console.log("Batch committed successfully, votesCast:", votesCast);
      
      // Verify by reading back
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "elections", userId, "votes"));
      console.log("Votes in Firestore after write:", snap.size);
    } catch (e) {
      console.error("Firestore write failed:", e);
    }
  }, 1000);

  // Init elections document
  const electionRef = doc(db, "elections", userId);
  const batch = writeBatch(db);
  batch.set(electionRef, { status: "polling", totalVoters }, { merge: true });
  try {
    await batch.commit();
  } catch (e) {
    console.error("Init batch FAILED:", e);
  }
};

export const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};
