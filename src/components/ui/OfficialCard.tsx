import * as React from "react";

import { cn } from "@/lib/utils";

export interface OfficialCardProps {
	title: string;
	children: React.ReactNode;
	status?: "active" | "default";
	className?: string;
}

export function OfficialCard({
	title,
	children,
	status = "default",
	className,
}: OfficialCardProps) {
	return (
		<section
			className={cn(
				"relative overflow-hidden border-2 border-inkNavy bg-formWhite",
				status === "active" ? "border-t-4 border-t-officialRed" : null,
				className
			)}
		>
			<div className="flex h-10 items-center border-b-2 border-inkNavy bg-inkNavy px-4 text-[11px] font-mono uppercase tracking-[0.12em] text-formWhite">
				{title}
			</div>
			<div className="p-6">{children}</div>
			<div className="pointer-events-none absolute bottom-3 right-3 opacity-[0.03]">
				<svg
					aria-hidden="true"
					viewBox="0 0 120 120"
					className="h-20 w-20 text-inkNavy"
				>
					<circle
						cx="60"
						cy="60"
						r="46"
						fill="none"
						stroke="currentColor"
						strokeWidth="6"
					/>
					<circle
						cx="60"
						cy="60"
						r="30"
						fill="none"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						d="M60 30 L66 52 L90 52 L70 66 L78 88 L60 74 L42 88 L50 66 L30 52 L54 52 Z"
						fill="currentColor"
					/>
				</svg>
			</div>
		</section>
	);
}
