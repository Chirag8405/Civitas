import * as React from "react";

import { StampBadge, type StampBadgeProps } from "@/components/ui/StampBadge";

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	badge?: StampBadgeProps;
}

export function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
	return (
		<header className="relative border-b-4 border-officialRed pb-4">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold text-inkNavy">{title}</h1>
				{subtitle ? (
					<p className="text-sm font-mono text-midGray">{subtitle}</p>
				) : null}
			</div>
			{badge ? (
				<div className="absolute right-0 top-0">
					<StampBadge {...badge} />
				</div>
			) : null}
		</header>
	);
}
