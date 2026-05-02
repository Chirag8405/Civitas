"use client";

import * as React from "react";
import { OfficialCard } from "./OfficialCard";
import { StampBadge } from "./StampBadge";

interface DisputeModalProps {
  pendingDispute: {
    id: string;
    zone: string;
    reason: string;
    votesAffected: number;
  } | null;
  disputeAdvisory: string;
  advisoryLoading: boolean;
  onRuling: (resolution: "ACCEPT" | "REJECT") => void;
}

export function DisputeModal({
  pendingDispute,
  disputeAdvisory,
  advisoryLoading,
  onRuling,
}: DisputeModalProps) {
  if (!pendingDispute) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-inkNavy/60 p-4 backdrop-blur-sm" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="dispute-title"
    >
      <OfficialCard
        title={`DISPUTE FILED — ${pendingDispute.zone}`}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        titleId="dispute-title"
      >
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <h3 className="font-mono text-xl font-bold text-inkNavy">
              {pendingDispute.reason}
            </h3>
            <StampBadge variant="DISPUTED" />
          </div>

          <div className="bg-paperCream border-l-4 border-gold p-6 font-mono text-sm text-inkNavy leading-relaxed">
            {advisoryLoading ? (
              <span className="animate-pulse">Consulting legal precedence...</span>
            ) : (
              disputeAdvisory
            )}
          </div>

          <div className="flex justify-end gap-4 mt-4 pt-4 border-t-2 border-ruleGray">
            <button
              onClick={() => onRuling("REJECT")}
              className="px-6 py-3 border-2 border-inkNavy text-inkNavy font-mono text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
            >
              REJECT VOTES ({pendingDispute.votesAffected})
            </button>
            <button
              onClick={() => onRuling("ACCEPT")}
              className="px-6 py-3 bg-officialRed text-formWhite font-mono text-sm font-bold uppercase tracking-widest hover:bg-red-800 transition-colors"
            >
              ACCEPT VOTES ({pendingDispute.votesAffected})
            </button>
          </div>
        </div>
      </OfficialCard>
    </div>
  );
}
