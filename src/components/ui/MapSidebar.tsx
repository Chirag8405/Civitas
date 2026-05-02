"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Zone, PollingBooth } from "@/types";

const ZONE_COLOURS: Record<Zone["color"], { hex: string; label: string }> = {
  navy: { hex: "#1A1A2E", label: "Zone A" },
  red: { hex: "#C0392B", label: "Zone B" },
  gold: { hex: "#D4A017", label: "Zone C" },
};

interface MapSidebarProps {
  constituency: any;
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  booths: PollingBooth[];
  showRadius: boolean;
  setShowRadius: React.Dispatch<React.SetStateAction<boolean>>;
  activeWarnings: string[];
  setDismissedWarnings: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleValidate: () => Promise<void>;
  validating: boolean;
  canValidate: boolean;
  advisorOpen: boolean;
  setAdvisorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClearBooths: () => void;
  boundaryLength: number;
}

export function MapSidebar({
  constituency,
  zones,
  setZones,
  booths,
  showRadius,
  setShowRadius,
  activeWarnings,
  setDismissedWarnings,
  handleValidate,
  validating,
  canValidate,
  advisorOpen,
  setAdvisorOpen,
  onClearBooths,
  boundaryLength,
}: MapSidebarProps) {
  return (
    <aside
      className="flex w-60 shrink-0 flex-col overflow-y-auto border-r-2 border-inkNavy bg-paperCream"
      style={{ minWidth: 240 }}
    >
      {/* Header */}
      <div className="border-b-2 border-inkNavy bg-inkNavy px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">
          ACT I — CONSTITUENCY SETUP
        </p>
      </div>

      <div className="flex flex-col gap-0 flex-1">
        {/* CONSTITUENCY */}
        <div className="border-b-2 border-inkNavy">
          <div className="bg-inkNavy px-4 py-1.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Constituency</p>
          </div>
          <div className="p-3">
            <p className="font-serif text-sm font-bold text-inkNavy leading-tight">
              {constituency.name || "—"}
            </p>
            <p className="font-mono text-[10px] text-midGray mt-0.5 uppercase">
              {constituency.country || "Country not set"}
            </p>
            <p className="font-mono text-[10px] text-midGray mt-1">
              {constituency.electoralSystemInfo?.system ?? "—"}
            </p>
          </div>
        </div>

        {/* POLLING ZONES */}
        <div className="border-b-2 border-inkNavy">
          <div className="bg-inkNavy px-4 py-1.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Polling Zones</p>
          </div>
          <div className="flex flex-col gap-0">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="border-b border-ruleGray px-3 py-2 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 shrink-0 border border-inkNavy"
                  style={{ background: ZONE_COLOURS[zone.color].hex }}
                />
                <input
                  type="text"
                  value={zone.name}
                  aria-label={`Zone ${zone.id} name`}
                  onChange={(e) =>
                    setZones((prev) =>
                      prev.map((z) =>
                        z.id === zone.id ? { ...z, name: e.target.value } : z
                      )
                    )
                  }
                  className="flex-1 bg-transparent font-mono text-xs text-inkNavy border-0 outline-none border-b border-transparent focus:border-inkNavy min-w-0"
                />
                <span className="font-mono text-[10px] text-midGray shrink-0">
                  {booths.filter((b) => b.zoneId === zone.id).length}v
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOOTH PLACEMENT */}
        <div className="border-b-2 border-inkNavy">
          <div className="bg-inkNavy px-4 py-1.5 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Booth Placement</p>
          </div>
          <div className="p-3 space-y-2">
            <p className="font-mono text-xs text-inkNavy font-bold">
              {booths.length} of 3 booths placed
            </p>

            <div className="flex items-center gap-2">
              <button
                id="toggle-radius"
                onClick={() => setShowRadius((v) => !v)}
                className={cn(
                  "h-4 w-4 border-2 border-inkNavy flex items-center justify-center shrink-0",
                  showRadius ? "bg-inkNavy" : "bg-formWhite"
                )}
                aria-pressed={showRadius}
              >
                {showRadius && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <polyline points="1,4 3,6 7,2" stroke="#F5F0E8" strokeWidth="1.5" />
                  </svg>
                )}
              </button>
              <span className="font-mono text-[10px] text-midGray">Show 1.2 km radius</span>
            </div>

            {booths.length > 0 && (
              <button
                onClick={onClearBooths}
                className="w-full border border-ruleGray py-1 font-mono text-[10px] text-midGray hover:text-officialRed hover:border-officialRed transition-colors"
              >
                Clear booths
              </button>
            )}
          </div>
        </div>

        {/* WARNINGS */}
        {activeWarnings.length > 0 && (
          <div className="border-b-2 border-officialRed">
            <div className="bg-officialRed px-4 py-1.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">
                ⚠ Flags to Resolve
              </p>
            </div>
            <div className="flex flex-col">
              {activeWarnings.map((w) => (
                <div
                  key={w}
                  className="border-b border-ruleGray px-3 py-2 flex items-start gap-2"
                >
                  <p className="font-mono text-[10px] text-officialRed flex-1 leading-tight">{w}</p>
                  <button
                    onClick={() => setDismissedWarnings((s) => new Set([...s, w]))}
                    className="shrink-0 font-mono text-[10px] text-midGray border border-ruleGray px-1 hover:border-inkNavy"
                    aria-label="Dismiss warning"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VALIDATE */}
        <div className="p-3 border-b-2 border-inkNavy">
          <button
            id="validate-boundary"
            onClick={handleValidate}
            disabled={!canValidate || validating}
            className={cn(
              "w-full border-2 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95",
              canValidate && !validating
                ? "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
                : "border-ruleGray text-midGray cursor-not-allowed"
            )}
          >
            {validating ? "PROCESSING..." : "Validate Boundary →"}
          </button>
          {!canValidate && (
            <p className="mt-1.5 font-mono text-[9px] text-midGray leading-tight">
              {boundaryLength < 3 && "Draw boundary on map. "}
              {booths.length < 3 && "Place 3 booths. "}
              {activeWarnings.length > 0 && "Dismiss all flags."}
            </p>
          )}
        </div>

        {/* ADVISOR TOGGLE */}
        <div className="p-3 mt-auto">
          <button
            id="map-advisor-toggle"
            onClick={() => setAdvisorOpen((v) => !v)}
            className={cn(
              "w-full border-2 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
              advisorOpen
                ? "bg-officialRed border-officialRed text-formWhite"
                : "border-inkNavy text-inkNavy hover:bg-govGold"
            )}
          >
            {advisorOpen ? "Close Advisor" : "Chief Advisor"}
          </button>
        </div>
      </div>
    </aside>
  );
}
