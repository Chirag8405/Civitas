"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface BallotCounterProps {
	current: number;
	total: number;
	label?: string;
	className?: string;
}

export function BallotCounter({
	current,
	total,
	label,
	className,
}: BallotCounterProps) {
	const sheetCount = 5;
	const progress = total > 0 ? Math.min(current / total, 1) : 0;
	const activeSheets = Math.round(progress * sheetCount);
	const defaultLabel = `${current} / ${total} VOTES CAST`;

	return (
		<div className={cn("flex flex-col items-center gap-4", className)}>
			<svg
				viewBox="0 0 120 120"
				className="h-24 w-24"
				aria-hidden="true"
			>
				<rect
					x="22"
					y="18"
					width="76"
					height="18"
					fill="#F5F0E8"
					stroke="#1A1A2E"
					strokeWidth="3"
				/>
				<rect
					x="14"
					y="40"
					width="92"
					height="56"
					fill="#F5F0E8"
					stroke="#1A1A2E"
					strokeWidth="3"
				/>
				{Array.from({ length: sheetCount }).map((_, index) => {
					const isActive = index < activeSheets;
					const lift = index * 5;
					return (
						<motion.rect
							key={index}
							x="28"
							y="34"
							width="64"
							height="14"
							fill="#FFFFFF"
							stroke="#1A1A2E"
							strokeWidth="2"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: isActive ? 1 : 0, y: isActive ? -lift : 10 }}
							transition={{ duration: 0.2, ease: "easeInOut" }}
						/>
					);
				})}
			</svg>
			<div className="text-center font-mono text-sm font-bold uppercase tracking-[0.12em] text-inkNavy">
				{label ?? defaultLabel}
			</div>
		</div>
	);
}
