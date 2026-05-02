"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type StampBadgeVariant =
	| "CERTIFIED"
	| "PENDING"
	| "DISPUTED"
	| "REJECTED"
	| "CLASSIFIED";

export interface StampBadgeProps {
	variant: StampBadgeVariant;
	text?: string;
	rotate?: number;
}

export function StampBadge({ variant, text, rotate }: StampBadgeProps) {
  const rotationMap: Record<StampBadgeVariant, number> = {
    CERTIFIED: -1.5,
    PENDING: 1.2,
    DISPUTED: -2.5,
    REJECTED: 3.1,
    CLASSIFIED: 0,
  };

  const finalRotation = rotate ?? rotationMap[variant];


  const variantClasses = {
    CERTIFIED: "border-officialGold text-officialGold",
    PENDING: "border-inkNavy text-inkNavy",
    DISPUTED: "border-officialRed text-officialRed ink-bleed",
    REJECTED: "border-officialRed text-officialRed ink-bleed",
    CLASSIFIED: "border-midGray text-midGray",
  }[variant];

  return (
    <span
      role="status"
      aria-label={variant}
      style={{ transform: `rotate(${finalRotation}deg)` }}
      className={cn(
        "inline-block border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]",
        "rounded-none",
        variantClasses
      )}
    >
      {text ?? variant}
    </span>
  );
}
