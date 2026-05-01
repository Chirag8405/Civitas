"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

// ─── Govt Seal SVG ────────────────────────────────────────────────────────────
function OfficialSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none">
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
      <path
        d="M40 16L43 26H54L46 32L49 42L40 36L31 42L34 32L26 26H37Z"
        fill="currentColor"
        opacity="0.2"
      />
      <text x="40" y="58" textAnchor="middle" fontSize="5" fontFamily="monospace" fill="currentColor" letterSpacing="1">
        OFFICIAL BALLOT
      </text>
    </svg>
  );
}

// ─── Sortable candidate row (for reorder in controls) ────────────────────────
function SortableCandidateRow({
  candidate,
  index,
}: {
  candidate: Candidate;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: candidate.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border-b border-ruleGray py-2 last:border-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-midGray hover:text-inkNavy"
        aria-label="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect y="2" width="14" height="1.5" fill="currentColor" />
          <rect y="6" width="14" height="1.5" fill="currentColor" />
          <rect y="10" width="14" height="1.5" fill="currentColor" />
        </svg>
      </button>
      <span className="font-mono text-[10px] text-midGray w-5">{index + 1}.</span>
      <span className="font-mono text-xs text-inkNavy font-bold flex-1">{candidate.name || "—"}</span>
      <span className="font-mono text-[10px] text-midGray">{candidate.party || "—"}</span>
    </div>
  );
}

// ─── Live ballot preview ──────────────────────────────────────────────────────
function BallotPreview({
  title,
  instructions,
  candidates,
  constituencyName,
  date,
  electionSystem,
}: {
  title: string;
  instructions: string;
  candidates: Candidate[];
  constituencyName: string;
  date: string;
  electionSystem: string;
}) {
  return (
    <div className="border-2 border-inkNavy bg-formWhite min-h-[600px] relative overflow-hidden">
      {/* Header strip */}
      <div className="border-b-4 border-inkNavy px-8 py-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-midGray">
            Official Document · {constituencyName}
          </p>
          <h1 className="font-serif text-2xl font-bold text-inkNavy mt-1 leading-tight">
            {title || "Official Ballot Paper"}
          </h1>
          <p className="font-mono text-[10px] text-midGray mt-1">
            {electionSystem}
          </p>
        </div>
        <OfficialSeal className="w-14 h-14 text-inkNavy opacity-20 shrink-0" />
      </div>

      {/* Red rule */}
      <div className="h-px bg-officialRed mx-8 my-0" />

      {/* Instructions */}
      <div className="px-8 py-5 border-b-2 border-ruleGray">
        <p className="font-mono text-[10px] uppercase tracking-widest text-midGray mb-2">
          Voting Instructions
        </p>
        <p className="font-mono text-xs text-inkNavy leading-relaxed whitespace-pre-line">
          {instructions || "Mark ONE box only with a ✗ or ✓. Return the paper to the Presiding Officer after voting."}
        </p>
      </div>

      {/* Candidates */}
      <div className="px-8 py-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-midGray mb-4">
          Candidates — Vote for ONE
        </p>
        <div className="space-y-3">
          {candidates.length === 0 && (
            <p className="font-mono text-xs text-midGray italic">No candidates registered.</p>
          )}
          {candidates.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-4 border-2 border-inkNavy px-4 py-3"
            >
              {/* SVG checkbox */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0 text-inkNavy">
                <rect x="1" y="1" width="18" height="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              <div className="flex-1">
                <p className="font-serif text-base font-bold text-inkNavy leading-tight">
                  {c.name || `Candidate ${i + 1}`}
                </p>
                <p className="font-mono text-[10px] text-midGray uppercase tracking-widest">
                  {c.party || "Party not set"}
                </p>
              </div>
              <span className="font-mono text-[10px] text-midGray w-6 text-right">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t-2 border-inkNavy px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OfficialSeal className="w-8 h-8 text-inkNavy" />
          <div>
            <p className="font-mono text-[9px] text-midGray uppercase tracking-widest leading-none">
              {constituencyName}
            </p>
            <p className="font-mono text-[9px] text-midGray">Election Date: {date}</p>
          </div>
        </div>
        <p className="font-mono text-[9px] text-midGray uppercase tracking-widest">
          Official Use Only
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BallotDesignPage() {
  const router = useRouter();
  const { constituency, election, updateElection, setPhase } = useSimulationStore();

  const pollingMilestone = election.milestones.find((m) => m.phase === "polling");
  const electionDate = pollingMilestone?.date ?? "TBD";

  const [candidates, setCandidates] = useState<Candidate[]>(election.candidates);
  const [ballotTitle, setBallotTitle] = useState(
    `${constituency.name || "Constituency"} Constituency Election`
  );
  const [instructions, setInstructions] = useState(
    "Mark ONE box only with a ✗. Do not mark more than one box. Do not sign or make any other mark on this paper. Return the ballot to the Presiding Officer after voting."
  );
  const [formUrl, setFormUrl] = useState<string | null>(election.ballotFormId ? `https://docs.google.com/forms/d/${election.ballotFormId}/viewform` : null);

  // Gemini review + flags
  const [flags, setFlags] = useState<string[]>([]);
  const [dismissedFlags, setDismissedFlags] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [certified, setCertified] = useState(false);
  const [creating, setCreating] = useState(false);

  // Advisor
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<GeminiMessage[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const activeFlags = flags.filter((f) => !f.startsWith("✓") && !dismissedFlags.has(f));
  const canCertify = activeFlags.length === 0 && flags.length > 0 && !certified;

  // ── Gemini auto-review ─────────────────────────────────────────────────────
  const handleGeminiReview = useCallback(async () => {
    setReviewing(true);
    setFlags([]);
    const prompt = `Review the following election ballot for clarity, fairness, and legal compliance:

Ballot Title: "${ballotTitle}"
Voting Instructions: "${instructions}"
Candidates (in order): ${candidates.map((c, i) => `${i + 1}. ${c.name} (${c.party})`).join(", ")}
Electoral System: ${constituency.electoralSystemInfo?.system ?? "FPTP"}
Country: ${constituency.country}

Check: (1) Are instructions clear and unambiguous? (2) Is candidate ordering fair and alphabetical or neutral? (3) Does the language meet accessibility standards? (4) Any legal compliance issues?

Return a JSON array of flag strings (issues only, empty array if none). No markdown, no code fences. Example: ["Instruction unclear: specify mark type", "Candidate ordering may not be neutral"]`;

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          context: { phase: "ballot", constituency: constituency.name },
        }),
      });
      const data = await res.json();
      const raw = (data.content ?? "[]").replace(/```(?:json)?\n?/g, "").trim();
      let parsed: string[] = [];
      try { parsed = JSON.parse(raw); } catch { parsed = []; }
      setFlags(parsed.length > 0 ? parsed : ["✓ No issues detected. Ballot content meets standards."]);
      setAdvisorMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), ref: data.advisoryRef, text: `Ballot review complete. ${parsed.length} flag(s) raised.` },
      ]);
    } catch {
      setFlags(["Advisory service unavailable."]);
    } finally {
      setReviewing(false);
    }
  }, [ballotTitle, instructions, candidates, constituency]);

  // ── Create Google Form ─────────────────────────────────────────────────────
  const handleCreateForm = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/google/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          candidates,
        }),
      });
      const data = await res.json();
      if (data.formUrl || data.mock) {
        setFormUrl(data.formUrl);
        updateElection({ ballotFormId: data.formId ?? "" });
      }
    } catch {
      console.error("Form creation failed");
    } finally {
      setCreating(false);
    }
  }, [candidates, constituency.name, updateElection]);

  // ── Certify ballot ─────────────────────────────────────────────────────────
  const handleCertify = async () => {
    updateElection({ candidates });
    setCertified(true);
    setPhase("polling");
    await new Promise((r) => setTimeout(r, 600));
    router.push(election.languages.length > 0 ? "/ballot/translate" : "/dashboard");
  };

  // ── Advisor send ──────────────────────────────────────────────────────────
  const handleAdvisorSend = useCallback(async (message: string) => {
    setAdvisorLoading(true);
    setAdvisorMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: message },
    ]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          context: { phase: "ballot", constituency: constituency.name },
        }),
      });
      const data = await res.json();
      setAdvisorMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), ref: data.advisoryRef, text: data.content ?? data.error ?? "No response." },
      ]);
    } catch {
      setAdvisorMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: "Advisory unavailable." },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  }, [constituency.name]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCandidates((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
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

      <main
        className={cn(
          "ml-60 flex-1 p-10 transition-[margin] duration-200 ease-in-out",
          advisorOpen ? "mr-[400px]" : "mr-0"
        )}
      >
        <PageHeader
          title="Ballot Design"
          subtitle={`${constituency.name || "Constituency"} — Official Ballot Paper`}
          badge={{ variant: certified ? "CERTIFIED" : "PENDING", text: certified ? "BALLOT CERTIFIED" : "DRAFT" }}
        />

        <div className="mt-8 flex gap-8">
          {/* ── Left 60%: Live preview ──────────────────────────────────── */}
          <div className="flex-[3] min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-midGray mb-3">
              Live Preview — Updates in real-time
            </p>
            <BallotPreview
              title={ballotTitle}
              instructions={instructions}
              candidates={candidates}
              constituencyName={constituency.name}
              date={electionDate}
              electionSystem={constituency.electoralSystemInfo?.system ?? ""}
            />
          </div>

          {/* ── Right 40%: Controls ──────────────────────────────────────── */}
          <div className="flex-[2] min-w-0 space-y-5">
            <OfficialCard title="Ballot Controls">
              <div className="space-y-4">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Election Title</span>
                  <OfficialInput
                    value={ballotTitle}
                    onChange={(e) => setBallotTitle(e.target.value)}
                    disabled={certified}
                    className="mt-1 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-midGray">Voting Instructions</span>
                  <OfficialTextarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={certified}
                    className="mt-1 text-xs min-h-[100px]"
                  />
                </label>
              </div>
            </OfficialCard>

            <OfficialCard title="Candidate Order">
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
                    <SortableCandidateRow key={c.id} candidate={c} index={i} />
                  ))}
                </SortableContext>
              </DndContext>
              {candidates.length === 0 && (
                <p className="font-mono text-xs text-midGray">No candidates. Register in previous step.</p>
              )}
            </OfficialCard>

            {/* Google Forms */}
            <OfficialCard title="Digital Ballot Form">
              {formUrl ? (
                <div className="space-y-2">
                  <StampBadge variant="CERTIFIED" text="FORM CREATED" />
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-2 font-mono text-xs text-govGold underline underline-offset-2 break-all"
                  >
                    Open Google Form ↗
                  </a>
                </div>
              ) : (
                <button
                  id="create-ballot-form"
                  onClick={handleCreateForm}
                  disabled={creating || candidates.length < 2 || certified}
                  className={cn(
                    "w-full border-2 py-2.5 font-mono text-xs font-bold uppercase tracking-widest transition-all active:scale-95",
                    candidates.length >= 2 && !creating && !certified
                      ? "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
                      : "border-ruleGray text-midGray cursor-not-allowed"
                  )}
                >
                  {creating ? "PROCESSING..." : "Create Google Form →"}
                </button>
              )}
            </OfficialCard>

            {/* Gemini review flags */}
            {flags.length > 0 && (
              <OfficialCard title="Advisory Flags" status="active">
                <div className="space-y-2">
                  {flags.map((f) => {
                    const dismissed = dismissedFlags.has(f);
                    const isGood = f.startsWith("✓");
                    return (
                      <div
                        key={f}
                        className={cn(
                          "flex items-start gap-2 border p-2",
                          dismissed ? "opacity-40" : isGood ? "border-govGold" : "border-officialRed"
                        )}
                      >
                        <p className={cn("font-mono text-[10px] flex-1 leading-tight", isGood ? "text-govGold" : "text-officialRed")}>
                          {f}
                        </p>
                        {!dismissed && !isGood && (
                          <button
                            onClick={() => setDismissedFlags((s) => new Set([...s, f]))}
                            className="shrink-0 font-mono text-[10px] text-midGray hover:text-inkNavy"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </OfficialCard>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                id="gemini-review"
                onClick={handleGeminiReview}
                disabled={reviewing || certified || candidates.length < 2}
                className={cn(
                  "w-full border-2 py-2.5 font-mono text-xs font-bold uppercase tracking-widest transition-colors",
                  !reviewing && !certified && candidates.length >= 2
                    ? "border-inkNavy text-inkNavy hover:bg-govGold hover:border-govGold"
                    : "border-ruleGray text-midGray cursor-not-allowed"
                )}
              >
                {reviewing ? "PROCESSING..." : "Gemini Review →"}
              </button>

              <button
                id="certify-ballot"
                onClick={handleCertify}
                disabled={!canCertify}
                className={cn(
                  "w-full border-2 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-all active:scale-95",
                  canCertify
                    ? "border-officialRed bg-officialRed text-formWhite hover:bg-inkNavy hover:border-inkNavy"
                    : "border-ruleGray text-midGray cursor-not-allowed"
                )}
              >
                {certified ? "✓ Ballot Certified" : "Certify Ballot →"}
              </button>

              <button
                id="ballot-advisor-toggle"
                onClick={() => setAdvisorOpen((v) => !v)}
                className="w-full border-2 border-inkNavy py-2 font-mono text-xs font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-all active:scale-95"
              >
                {advisorOpen ? "Close Advisor" : "Consult Advisor"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {advisorOpen && (
        <div className="fixed bottom-0 right-0 top-0 w-[400px] z-50 shadow-2xl">
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
