import * as React from "react";
import { Lock } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type NavItemKey = "overview" | "act1" | "act2" | "act3";

export interface SidebarProps {
	active?: NavItemKey;
	lockedActs?: NavItemKey[];
	userName: string;
	userRole?: string;
	avatarUrl?: string;
	onSignOut?: () => void;
}

const navItems: Array<{ key: NavItemKey; label: string }> = [
	{ key: "overview", label: "OVERVIEW" },
	{ key: "act1", label: "ACT 1" },
	{ key: "act2", label: "ACT 2" },
	{ key: "act3", label: "ACT 3" },
];

export function Sidebar({
	active = "overview",
	lockedActs = [],
	userName,
	userRole = "Returning Officer",
	avatarUrl,
	onSignOut,
}: SidebarProps) {
	const initials = userName
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		<aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r-2 border-inkNavy bg-inkNavy text-formWhite">
			<div className="px-6 py-6">
				<div className="text-2xl font-bold text-formWhite font-[var(--font-display)]">
					CIVITAS
					<span className="ml-2 text-officialRed">.</span>
				</div>
				<div className="mt-2 text-[11px] font-mono uppercase tracking-[0.12em] text-midGray">
					CIVIC OPERATIONS
				</div>
			</div>
			<nav className="flex-1 space-y-2 px-4">
				{navItems.map((item) => {
					const isActive = item.key === active;
					const isLocked = lockedActs.includes(item.key) && item.key !== "overview";

					return (
						<button
							key={item.key}
							type="button"
							className={cn(
								"flex w-full items-center justify-between border-l-4 px-3 py-3 text-left text-[12px] font-mono uppercase tracking-[0.12em]",
								isActive
									? "border-officialRed bg-formWhite text-inkNavy"
									: "border-transparent text-formWhite"
							)}
							aria-current={isActive ? "page" : undefined}
						>
							{item.label}
							{isLocked ? (
								<Lock className="h-4 w-4 text-officialRed" aria-hidden="true" />
							) : null}
						</button>
					);
				})}
			</nav>
			<div className="border-t-2 border-inkNavy px-6 py-6">
				<div className="flex items-center gap-3">
					{avatarUrl ? (
						<Image
							src={avatarUrl}
							alt={`${userName} avatar`}
							width={40}
							height={40}
							className="rounded-full object-cover"
						/>
					) : (
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-formWhite text-sm font-mono text-inkNavy">
							{initials}
						</div>
					)}
					<div>
						<div className="text-sm font-mono text-formWhite">{userName}</div>
						<div className="text-[11px] font-mono uppercase tracking-[0.12em] text-midGray">
							{userRole}
						</div>
					</div>
				</div>
				<button
					type="button"
					onClick={onSignOut}
					className="mt-4 text-[11px] font-mono uppercase tracking-[0.12em] text-midGray"
				>
					Sign out
				</button>
			</div>
		</aside>
	);
}
