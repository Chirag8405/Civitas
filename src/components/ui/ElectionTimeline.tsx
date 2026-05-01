"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface TimelineMilestone {
	date: string;
	title: string;
	description?: string;
	phase: "registration" | "campaign" | "polling" | "results";
	status: "past" | "current" | "future";
}

export interface ElectionTimelineProps {
	milestones: TimelineMilestone[];
}

const phaseBorder = {
	registration: "border-inkNavy",
	campaign: "border-govGold",
	polling: "border-officialRed",
	results: "border-govGold",
};

const statusClasses = {
	past: "text-midGray",
	current: "text-inkNavy",
	future: "text-midGray opacity-70",
};

export function ElectionTimeline({ milestones }: ElectionTimelineProps) {
	return (
		<div className="space-y-6">
			{milestones.map((milestone, index) => (
				<motion.div
					key={`${milestone.title}-${index}`}
					initial={{ opacity: 0, x: -16 }}
					whileInView={{ opacity: 1, x: 0 }}
					viewport={{ once: true, amount: 0.3 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
					className={cn(
						"grid grid-cols-[110px_1fr] gap-4 border-l-4 pl-4",
						phaseBorder[milestone.phase],
						statusClasses[milestone.status]
					)}
				>
					<div className="text-sm font-mono">
						<div className="flex items-center gap-2">
							<span>{milestone.date}</span>
							{milestone.status === "past" ? (
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									className="h-4 w-4 text-govGold"
								>
									<path
										d="M5 13l4 4L19 7"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="square"
									/>
								</svg>
							) : null}
						</div>
					</div>
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-bold text-inkNavy">
								{milestone.title}
							</h3>
							{milestone.status === "current" ? (
								<span className="h-2 w-2 bg-officialRed" aria-hidden="true" />
							) : null}
						</div>
						{milestone.description ? (
							<p className="text-sm font-mono text-midGray">
								{milestone.description}
							</p>
						) : null}
					</div>
				</motion.div>
			))}
		</div>
	);
}
