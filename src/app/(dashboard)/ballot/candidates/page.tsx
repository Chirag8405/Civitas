"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSimulationStore } from "@/store/simulation.store";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { OfficialInput, OfficialTextarea } from "@/components/ui/FormField";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

// ─── Candidate card (sortable) ────────────────────────────────────────────────
function SortableCandidateCard({
  candidate,
  index,
  onUpdate,
  onRemove,
  closed,
}: {
  candidate: Candidate;
  index: number;
  onUpdate: (id: string, field: keyof Candidate, value: string) => void;
  onRemove: (id: string) => void;
  closed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OfficialCard
        title={`Candidate ${index + 1}`}
        status={candidate.name && candidate.party ? "active" : "default"}
      >
        <div className="space-y-4">
          {/* Drag handle + remove */}
          <div className="flex items-center justify-between">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 border border-ruleGray hover:border-inkNavy"
              aria-label="Drag to reorder"
              disabled={closed}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-midGray">
                <rect y="3" width="16" height="1.5" fill="currentColor" />
                <rect y="7" width="16" height="1.5" fill="currentColor" />
                <rect y="11" width="16" height="1.5" fill="currentColor" />
              </svg>
            </button>
            {!closed && (
              <button
                onClick={() => onRemove(candidate.id)}
                className="font-mono text-[10px] text-midGray hover:text-officialRed transition-colors"
              >
                REMOVE ✕
              </button>
            )}
          </div>

          {/* Photo placeholder / upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border-2 border-inkNavy bg-paperCream flex items-center justify-center shrink-0 overflow-hidden">
              {candidate.photoUrl ? (
                <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ruleGray">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <label className="block mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Photo URL</span>
                <OfficialInput
                  value={candidate.photoUrl ?? ""}
                  onChange={(e) => onUpdate(candidate.id, "photoUrl", e.target.value)}
                  placeholder="https://…"
                  disabled={closed}
                  className="mt-1 text-xs"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Full Name *</span>
            <OfficialInput
              value={candidate.name}
              onChange={(e) => onUpdate(candidate.id, "name", e.target.value)}
              placeholder="Candidate full name"
              disabled={closed}
              className="mt-1"
            />
          </label>

          {/* Party */}
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Party / Independent *</span>
            <OfficialInput
              value={candidate.party}
              onChange={(e) => onUpdate(candidate.id, "party", e.target.value)}
              placeholder="Party name or INDEPENDENT"
              disabled={closed}
              className="mt-1"
            />
          </label>

          {/* Manifesto */}
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Manifesto Summary</span>
            <OfficialTextarea
              value={candidate.manifesto ?? ""}
              onChange={(e) => onUpdate(candidate.id, "manifesto", e.target.value)}
              placeholder="Brief manifesto or policy statement"
              disabled={closed}
              className="mt-1 min-h-[72px]"
            />
          </label>
        </div>
      </OfficialCard>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const router = useRouter();
  const { constituency, election, updateElection } = useSimulationStore();

  const [candidates, setCandidates] = useState<Candidate[]>(
    election.candidates.length > 0
      ? election.candidates
      : []
  );
  const [closed, setClosed] = useState(election.candidates.length >= 2);
  const [closing, setClosing] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const addCandidate = () => {
    const id = `c-${Date.now()}`;
    setCandidates((prev) => [
      ...prev,
      { id, name: "", party: "", photoUrl: "", manifesto: "" },
    ]);
  };

  const updateCandidate = useCallback(
    (id: string, field: keyof Candidate, value: string) => {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const removeCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCandidates((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const validCandidates = candidates.filter((c) => c.name.trim() && c.party.trim());
  const canClose = validCandidates.length >= 2 && !closed;

  const handleCloseNominations = async () => {
    setClosing(true);
    updateElection({ candidates: validCandidates });
    await new Promise((r) => setTimeout(r, 600));
    setClosed(true);
    setClosing(false);
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
          title="Candidate Registration"
          subtitle={`${constituency.name || "Constituency"} — Official Nominations`}
          badge={{ variant: closed ? "CERTIFIED" : "PENDING", text: closed ? "NOMINATIONS CLOSED" : "OPEN" }}
        />

        <div className="mt-8 grid grid-cols-3 gap-8">
          {/* ── Candidate cards ──────────────────────────────────────────── */}
          <div className="col-span-2 space-y-6">
            {candidates.length === 0 && !closed && (
              <div className="border-2 border-dashed border-ruleGray p-10 text-center">
                <p className="font-mono text-xs text-midGray">No candidates registered yet.</p>
                <p className="font-mono text-[10px] text-midGray mt-1">Use "Add Candidate +" to begin.</p>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={candidates.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {candidates.map((c, i) => (
                  <SortableCandidateCard
                    key={c.id}
                    candidate={c}
                    index={i}
                    onUpdate={updateCandidate}
                    onRemove={removeCandidate}
                    closed={closed}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {!closed && (
              <button
                id="add-candidate"
                onClick={addCandidate}
                className="w-full border-2 border-dashed border-inkNavy py-4 font-mono text-sm font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-colors"
              >
                + Add Candidate
              </button>
            )}
          </div>

          {/* ── Right: status + actions ──────────────────────────────────── */}
          <div className="space-y-6">
            <OfficialCard title="Nomination Status">
              <div className="space-y-3">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-midGray">Total registered</span>
                  <span className="font-bold text-inkNavy">{candidates.length}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-midGray">Valid nominations</span>
                  <span className="font-bold text-inkNavy">{validCandidates.length}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-midGray">Minimum required</span>
                  <span className="font-bold text-inkNavy">2</span>
                </div>

                <div className="border-t-2 border-ruleGray pt-3">
                  {closed ? (
                    <StampBadge variant="CERTIFIED" text="NOMINATIONS CLOSED" />
                  ) : validCandidates.length >= 2 ? (
                    <StampBadge variant="PENDING" text="READY TO CLOSE" />
                  ) : (
                    <p className="font-mono text-[10px] text-midGray">
                      Need {2 - validCandidates.length} more valid nomination(s).
                    </p>
                  )}
                </div>
              </div>
            </OfficialCard>

            {!closed && (
              <button
                id="close-nominations"
                onClick={handleCloseNominations}
                disabled={!canClose || closing}
                className={cn(
                  "w-full border-2 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-colors",
                  canClose && !closing
                    ? "border-officialRed bg-officialRed text-formWhite hover:bg-inkNavy hover:border-inkNavy"
                    : "border-ruleGray text-midGray cursor-not-allowed"
                )}
              >
                {closing ? "Closing…" : "Close Nominations →"}
              </button>
            )}

            {closed && (
              <button
                onClick={() => router.push("/ballot/design")}
                className="w-full border-2 border-inkNavy bg-inkNavy py-3 font-mono text-xs font-bold uppercase tracking-widest text-formWhite hover:bg-officialRed hover:border-officialRed transition-colors"
              >
                Design Ballot →
              </button>
            )}

            <button
              onClick={() => router.push("/calendar")}
              className="w-full border-2 border-inkNavy py-2 font-mono text-xs font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-colors"
            >
              ← Back to Calendar
            </button>

            <OfficialCard title="Electoral Rules">
              <p className="font-mono text-[10px] text-midGray leading-relaxed">
                {constituency.electoralSystemInfo?.registrationRules ?? "Configure constituency to see registration rules."}
              </p>
            </OfficialCard>
          </div>
        </div>
      </main>
    </div>
  );
}
