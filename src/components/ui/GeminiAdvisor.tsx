"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { OfficialInput } from "@/components/ui/FormField";

export interface GeminiMessage {
	id: string;
	ref?: string;
	text: string;
}

export interface GeminiAdvisorProps {
	onSend: (message: string) => Promise<void>;
	messages: GeminiMessage[];
	loading: boolean;
}

export function GeminiAdvisor({ onSend, messages, loading }: GeminiAdvisorProps) {
	const [query, setQuery] = React.useState("");

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!query.trim() || loading) return;
		await onSend(query.trim());
		setQuery("");
	};

	return (
		<motion.aside
			initial={{ x: 420, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: 420, opacity: 0 }}
			transition={{ duration: 0.2, ease: "easeInOut" }}
			className="flex h-full w-[400px] flex-col border-l-2 border-inkNavy bg-paperCream"
		>
			<div className="flex h-10 items-center bg-inkNavy px-4 text-[11px] font-mono uppercase tracking-[0.12em] text-formWhite">
				CHIEF ELECTION COMMISSIONER
			</div>
			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				{messages.map((message) => (
					<div key={message.id} className="space-y-2">
						<div className="text-[11px] font-mono uppercase tracking-[0.12em] text-midGray">
							{message.ref ?? "ADVISORY REF: CE-0000"}
						</div>
						<p className="text-sm font-mono text-inkNavy">{message.text}</p>
					</div>
				))}
				{loading ? (
					<div className="text-[11px] font-mono uppercase tracking-[0.12em] text-midGray">
						PROCESSING...
					</div>
				) : null}
			</div>
			<form onSubmit={handleSubmit} className="border-t-2 border-inkNavy p-4">
				<div className="flex items-center gap-2">
					<OfficialInput
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Enter advisory query"
					/>
					<button
						type="submit"
						className="whitespace-nowrap rounded-none bg-inkNavy px-4 py-2 text-[12px] font-mono uppercase tracking-[0.12em] text-formWhite"
					>
						SUBMIT QUERY →
					</button>
				</div>
			</form>
		</motion.aside>
	);
}
