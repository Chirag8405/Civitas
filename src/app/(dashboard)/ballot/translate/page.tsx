"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";

type FieldKey = "title" | "instructions" | `candidate_${number}`;
type ApprovalState = "pending" | "approved" | "revision";

interface TranslationField {
  key: FieldKey;
  label: string;
  original: string;
  translated: string;
  approval: ApprovalState;
}

// Detect target language from constituency data (simplified)
function detectLanguage(country: string): { code: string; name: string } | null {
  const map: Record<string, { code: string; name: string }> = {
    IN: { code: "hi", name: "Hindi" },
    ZA: { code: "zu", name: "Zulu" },
    CH: { code: "fr", name: "French" },
    BE: { code: "fr", name: "French" },
    CA: { code: "fr", name: "French" },
  };
  return map[country] ?? null;
}

export default function TranslatePage() {
  const router = useRouter();
  const { constituency, election, updateElection } = useSimulationStore();

  const targetLang = detectLanguage(constituency.country);

  // If no minority language detected, redirect away
  useEffect(() => {
    if (!targetLang && constituency.country) {
      router.replace("/dashboard");
    }
  }, [targetLang, constituency.country, router]);



  const buildFields = (): TranslationField[] => {
    const fields: TranslationField[] = [
      {
        key: "title",
        label: "Ballot Title",
        original: `${constituency.name || "Constituency"} Constituency Election`,
        translated: "",
        approval: "pending",
      },
      {
        key: "instructions",
        label: "Voting Instructions",
        original: "Mark ONE box only with a ✗. Do not mark more than one box. Return the ballot to the Presiding Officer after voting.",
        translated: "",
        approval: "pending",
      },
      ...election.candidates.map((c, i): TranslationField => ({
        key: `candidate_${i}` as FieldKey,
        label: `Candidate ${i + 1} — Party`,
        original: `${c.name} — ${c.party}`,
        translated: "",
        approval: "pending",
      })),
    ];
    return fields;
  };

  const [fields, setFields] = useState<TranslationField[]>(buildFields);
  const [translating, setTranslating] = useState(false);
  const [allApproved, setAllApproved] = useState(false);
  const [certifying, setCertifying] = useState(false);

  // Check all approved
   
  useEffect(() => {
    setAllApproved(fields.length > 0 && fields.every((f) => f.approval === "approved"));
  }, [fields]);

  // ── Translate all ──────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async () => {
    if (!targetLang) return;
    setTranslating(true);
    try {
      const texts: Record<string, string> = {};
      fields.forEach((f) => { texts[f.key] = f.original; });

      const res = await fetch("/api/google/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, targetLanguage: targetLang.code }),
      });
      const data = await res.json();

      if (data.translations) {
        setFields((prev) =>
          prev.map((f) => ({
            ...f,
            translated: data.translations[f.key] ?? f.translated,
            approval: "pending",
          }))
        );
      }
    } catch {
      console.error("Translation failed");
    } finally {
      setTranslating(false);
    }
  }, [fields, targetLang]);

  const setApproval = (key: FieldKey, state: ApprovalState) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, approval: state } : f))
    );
  };

  const handleCertify = async () => {
    setCertifying(true);
    updateElection({ languages: [targetLang?.code ?? ""] });
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  };

  if (!targetLang) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paperCream">
        <p className="font-mono text-xs text-midGray">Redirecting…</p>
      </div>
    );
  }

  const approvedCount = fields.filter((f) => f.approval === "approved").length;

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

      <main id="main" className="ml-60 flex-1 p-10">
        <PageHeader
          title="Ballot Translation"
          subtitle={`${constituency.name} · Minority Language: ${targetLang.name}`}
          badge={{ variant: allApproved ? "CERTIFIED" : "PENDING", text: allApproved ? "APPROVED" : "REVIEW REQUIRED" }}
        />

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-4 border-2 border-inkNavy bg-formWhite px-4 py-3">
          <p className="font-mono text-xs text-inkNavy">
            <strong>{approvedCount}</strong> of <strong>{fields.length}</strong> fields approved
          </p>
          <div className="flex-1 h-1 bg-ruleGray">
            <div
              className="h-1 bg-govGold transition-all duration-300"
              style={{ width: `${fields.length ? (approvedCount / fields.length) * 100 : 0}%` }}
            />
          </div>
          <button
            id="translate-all"
            onClick={handleTranslate}
            disabled={translating}
            className={cn(
              "border-2 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95",
              translating
                ? "border-ruleGray text-midGray cursor-not-allowed"
                : "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
            )}
          >
            {translating ? "PROCESSING..." : `Translate All → ${targetLang.name}`}
          </button>
        </div>

        {/* Side-by-side fields */}
        <div className="mt-6 space-y-4">
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-b-2 border-inkNavy pb-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-midGray">English (Source)</p>
            </div>
            <div className="border-b-2 border-inkNavy pb-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-midGray">
                {targetLang.name} (Translated)
              </p>
            </div>
          </div>

          {fields.map((field) => (
            <div
              key={field.key}
              className={cn(
                "border-2 transition-colors",
                field.approval === "approved" && "border-govGold",
                field.approval === "revision" && "border-officialRed",
                field.approval === "pending" && "border-ruleGray"
              )}
            >
              {/* Field label */}
              <div className="flex items-center justify-between border-b border-ruleGray bg-paperCream px-4 py-1.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-midGray">
                  {field.label}
                </p>
                <div className="flex items-center gap-2">
                  {field.approval === "approved" && (
                    <StampBadge variant="CERTIFIED" text="APPROVED" rotate={0} />
                  )}
                  {field.approval === "revision" && (
                    <StampBadge variant="REJECTED" text="REVISION" rotate={0} />
                  )}
                </div>
              </div>

              {/* Side by side */}
              <div className="grid grid-cols-2 gap-0">
                <div className="border-r border-ruleGray p-4">
                  <p className="font-mono text-xs text-inkNavy leading-relaxed">{field.original}</p>
                </div>
                <div className="p-4">
                  {field.translated ? (
                    <p className="font-mono text-xs text-inkNavy leading-relaxed">{field.translated}</p>
                  ) : (
                    <p className="font-mono text-xs text-midGray italic">
                      {translating ? "Translating…" : "Not yet translated. Click Translate All."}
                    </p>
                  )}
                </div>
              </div>

              {/* Approval actions */}
              {field.translated && field.approval !== "approved" && (
                <div className="flex items-center gap-2 border-t border-ruleGray px-4 py-2">
                  <button
                    onClick={() => setApproval(field.key, "approved")}
                    className="border-2 border-govGold px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-govGold hover:bg-govGold hover:text-inkNavy transition-all active:scale-95"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setApproval(field.key, "revision")}
                    className="border-2 border-officialRed px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-officialRed hover:bg-officialRed hover:text-formWhite transition-all active:scale-95"
                  >
                    ✕ Request Revision
                  </button>
                  {field.approval === "revision" && (
                    <p className="font-mono text-[10px] text-midGray ml-2">
                      Contact translation team to revise this field.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Certify */}
        <div className="mt-8 flex gap-4">
          <button
            id="certify-translation"
            onClick={handleCertify}
            disabled={!allApproved || certifying}
            className={cn(
              "border-2 px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest transition-all active:scale-95",
              allApproved && !certifying
                ? "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
                : "border-ruleGray text-midGray cursor-not-allowed"
            )}
          >
            {certifying ? "PROCESSING..." : "Certify Translation →"}
          </button>
          <button
            onClick={() => router.push("/ballot/design")}
            className="border-2 border-inkNavy px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-all active:scale-95"
          >
            ← Back to Design
          </button>
        </div>
      </main>
    </div>
  );
}
