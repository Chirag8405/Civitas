"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
import { cn } from "@/lib/utils";

interface ZoneBreakdown {
  id: string;
  name: string;
  voterCount: number;
}

export default function VoterRollPage() {
  const router = useRouter();
  const { constituency, setPhase, updateConstituency } = useSimulationStore();

  const [zoneBreakdown, setZoneBreakdown] = useState<ZoneBreakdown[]>([]);
  const [accessibilityAdvisory, setAccessibilityAdvisory] = useState<string>("");
  const [advisoryLoading, setAdvisoryLoading] = useState(true);
  const [certifying, setCertifying] = useState(false);
  const [certified, setCertified] = useState(false);

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<GeminiMessage[]>([]);
  const [advisorMsgLoading, setAdvisorMsgLoading] = useState(false);

  const voterCount = 200;
  const sheetUrl = constituency.voterRollUrl;

  // ── Guard: map + booths must be complete before reaching voter-roll ───────────
  useEffect(() => {
    if (constituency.pollingBooths.length === 0) {
      router.replace("/setup/map");
    }
  }, [constituency.pollingBooths.length, router]);

  // ── Zone breakdown from store ──────────────────────────────────────────────
  useEffect(() => {
    if (constituency.zones.length > 0) {
      const perZone = Math.floor(voterCount / constituency.zones.length);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZoneBreakdown(
        constituency.zones.map((z, i) => ({
          id: z.id,
          name: z.name,
          voterCount: i < voterCount % constituency.zones.length ? perZone + 1 : perZone,
        }))
      );
    }
  }, [constituency.zones]);

  // ── Auto accessibility advisory ────────────────────────────────────────────
  useEffect(() => {
     
    if (!constituency.name || !constituency.country) {
      setAdvisoryLoading(false);
      return;
    }
    const prompt = `Review the constituency "${constituency.name}" in ${constituency.country} with ${constituency.pollingBooths.length} polling booths and ${constituency.zones.length} zones covering approximately 200 registered voters. Identify any accessibility or social inclusion flags that the Returning Officer must address before certification. Be concise — bullet points only.`;

    fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        context: { phase: "setup", constituency: constituency.name },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setAccessibilityAdvisory(data.content ?? "No advisory generated.");
        setAdvisorMessages([
          {
            id: "auto-1",
            ref: data.advisoryRef,
            text: data.content ?? "No advisory generated.",
          },
        ]);
      })
      .catch(() => setAccessibilityAdvisory("Advisory service unavailable."))
      .finally(() => setAdvisoryLoading(false));
  }, [constituency.name, constituency.country, constituency.pollingBooths.length, constituency.zones.length]);

  // ── Certify constituency ───────────────────────────────────────────────────
  const handleCertify = async () => {
    setCertifying(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // brief pause for effect
      setCertified(true);
      setPhase("calendar");
      updateConstituency({});
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setCertifying(false);
    }
  };

  // ── Advisor send ──────────────────────────────────────────────────────────
  const handleAdvisorSend = useCallback(async (message: string) => {
    setAdvisorMsgLoading(true);
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
          context: { phase: "setup", constituency: constituency.name },
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
      setAdvisorMsgLoading(false);
    }
  }, [constituency.name]);

  return (
    <div className="flex min-h-screen bg-paperCream">
      <Sidebar
        active="act1"
        lockedActs={[]}
        userName="Administrator"
        userRole="Returning Officer"
        avatarUrl=""
        onSignOut={() => router.push("/login")}
      />

      <main
        id="main"
        className={cn(
          "ml-60 flex-1 p-10 transition-[margin] duration-200 ease-in-out",
          advisorOpen ? "mr-[400px]" : "mr-0"
        )}
      >
        <PageHeader
          title="Official Voter Roll"
          subtitle={`${constituency.name || "Constituency"} · ${constituency.country}`}
          badge={{ variant: "CERTIFIED", text: "VERIFIED" }}
        />

        {/* Certified banner */}
        {certified && (
          <div className="mt-6 border-2 border-govGold bg-formWhite px-6 py-4 flex items-center gap-4">
            <StampBadge variant="CERTIFIED" rotate={-1} />
            <div>
              <p className="font-serif text-lg font-bold text-inkNavy">
                Constituency Certified
              </p>
              <p className="font-mono text-xs text-midGray">
                Redirecting to Election Calendar…
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-6">
          {/* Metric cards */}
          <OfficialCard title="Total Registered Voters">
            <div className="text-center py-2">
              <p className="font-serif text-5xl font-bold text-inkNavy">{voterCount}</p>
              <p className="font-mono text-xs text-midGray uppercase tracking-widest mt-1">
                Registered Electors
              </p>
              <div className="mt-3">
                <StampBadge variant="CERTIFIED" text="ROLL VERIFIED" />
              </div>
            </div>
          </OfficialCard>

          <OfficialCard title="Zone Breakdown">
            <div className="space-y-2">
              {zoneBreakdown.length === 0 ? (
                <p className="font-mono text-xs text-midGray">No zones configured.</p>
              ) : (
                zoneBreakdown.map((z) => (
                  <div key={z.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-inkNavy">{z.name}</span>
                    <span className="font-mono text-xs font-bold text-inkNavy">
                      {z.voterCount}
                    </span>
                  </div>
                ))
              )}
              <div className="pt-2 border-t border-ruleGray flex justify-between">
                <span className="font-mono text-xs text-midGray">Total</span>
                <span className="font-mono text-xs font-bold text-inkNavy">{voterCount}</span>
              </div>
            </div>
          </OfficialCard>

          <OfficialCard title="Accessibility Flags" status={advisoryLoading ? "default" : "active"}>
            {advisoryLoading ? (
              <p className="font-mono text-xs text-midGray">Querying Chief Advisor…</p>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-inkNavy leading-relaxed whitespace-pre-line line-clamp-6">
                  {accessibilityAdvisory}
                </p>
                <button
                  onClick={() => setAdvisorOpen(true)}
                  className="font-mono text-[10px] text-officialRed underline underline-offset-2"
                >
                  View full advisory →
                </button>
              </div>
            )}
          </OfficialCard>
        </div>

        {/* Embedded Sheet */}
        <div className="mt-6 border-2 border-inkNavy">
          <div className="flex h-10 items-center border-b-2 border-inkNavy bg-inkNavy px-4 gap-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-formWhite">
              {constituency.name || "Constituency"} — Official Voter Roll
            </span>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto font-mono text-[10px] text-govGold hover:underline"
              >
                Open in Sheets ↗
              </a>
            )}
          </div>

          {sheetUrl ? (
            <iframe
              src={sheetUrl.replace("/edit", "/preview")}
              className="w-full border-0"
              style={{ height: 400 }}
              title="Official Voter Roll"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="flex h-64 items-center justify-center bg-paperCream">
              <div className="text-center">
                <StampBadge variant="PENDING" text="SHEET PENDING" />
                <p className="mt-3 font-mono text-xs text-midGray">
                  Google Sheets URL not yet available.
                </p>
                <p className="font-mono text-[10px] text-midGray">
                  Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and Sheets scope are configured.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Certify CTA */}
        <div className="mt-6 flex items-center gap-4">
          <button
            id="certify-constituency"
            onClick={handleCertify}
            disabled={certifying || certified}
            className={cn(
              "border-2 px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest transition-all active:scale-95",
              certified
                ? "border-govGold bg-govGold text-inkNavy cursor-not-allowed"
                : certifying
                ? "border-midGray text-midGray cursor-not-allowed"
                : "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
            )}
          >
            {certified
              ? "✓ Constituency Certified"
              : certifying
              ? "PROCESSING..."
              : "Certify Constituency →"}
          </button>

          <button
            id="voter-roll-advisor-toggle"
            onClick={() => setAdvisorOpen((v) => !v)}
            className="border-2 border-inkNavy px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold transition-all active:scale-95"
          >
            {advisorOpen ? "Close Advisor" : "Consult Advisor"}
          </button>
        </div>
      </main>

      {/* Gemini Advisor */}
      {advisorOpen && (
        <div className="fixed bottom-0 right-0 top-0 w-[400px] z-50 shadow-2xl">
          <GeminiAdvisor
            onSend={handleAdvisorSend}
            messages={advisorMessages}
            loading={advisorMsgLoading}
          />
        </div>
      )}
    </div>
  );
}
