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
	rotate?: -2 | -1 | 0 | 1 | 2;
}

const rotationOptions: Array<StampBadgeProps["rotate"]> = [-2, -1, 0, 1, 2];

const rotationClass = (rotation: StampBadgeProps["rotate"]) => {
	if (rotation === -2) return "-rotate-2";
	if (rotation === -1) return "-rotate-1";
	if (rotation === 1) return "rotate-1";
	if (rotation === 2) return "rotate-2";
	return "rotate-0";
};

export function StampBadge({ variant, text, rotate }: StampBadgeProps) {
  const rotationMap: Record<StampBadgeVariant, StampBadgeProps["rotate"]> = {
    CERTIFIED: -1,
    PENDING: 1,
    DISPUTED: -2,
    REJECTED: 2,
    CLASSIFIED: 0,
  };

  const rotation = rotate ?? rotationMap[variant];

  const variantClasses = {
    CERTIFIED: "border-govGold text-govGold",
    PENDING: "border-inkNavy text-inkNavy",
    DISPUTED: "border-officialRed text-officialRed ink-bleed",
    REJECTED: "border-officialRed text-officialRed ink-bleed",
    CLASSIFIED: "border-midGray text-midGray",
  }[variant];

  return (
    <span
      className={cn(
        "inline-block border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]",
        "rounded-none",
        rotationClass(rotation),
        variantClasses
      )}
    >
      {text ?? variant}
    </span>
  );
}
