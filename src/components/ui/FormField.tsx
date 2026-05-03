import * as React from "react";

import { cn } from "@/lib/utils";

export interface FormFieldProps {
	label: string;
	error?: string;
	htmlFor?: string;
	id?: string;
	children: React.ReactNode;
}

export function FormField({ label, error, htmlFor, id, children }: FormFieldProps) {
	const finalHtmlFor = htmlFor ?? id;
	const field = React.isValidElement(children)
		? React.cloneElement(children as React.ReactElement<any>, {
				className: cn(
					(children.props as { className?: string }).className,
					error ? "border-officialRed bg-stampRedBg" : null
				),
				"aria-invalid": error ? true : undefined,
			})
		: children;

	return (
		<label className="block" {...(finalHtmlFor ? { htmlFor: finalHtmlFor } : {})}>
			<span className="mb-1.5 block text-[11px] font-mono uppercase tracking-[0.12em] text-midGray">
				{label}
			</span>
			{field}
			{error ? (
				<span className="mt-2 block text-[12px] font-mono text-officialRed">
					{error}
				</span>
			) : null}
		</label>
	);
}

export type OfficialInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const OfficialInput = React.forwardRef<
	HTMLInputElement,
	OfficialInputProps
>(({ className, ...props }, ref) => (
	<input
		ref={ref}
		className={cn(
			"w-full rounded-none border-2 border-inkNavy bg-formWhite px-4 py-2 text-[15px] font-mono text-inkNavy placeholder:text-midGray",
			"focus-visible:border-officialRed focus-visible:outline-none",
			className
		)}
		{...props}
	/>
));
OfficialInput.displayName = "OfficialInput";

export type OfficialTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const OfficialTextarea = React.forwardRef<
	HTMLTextAreaElement,
	OfficialTextareaProps
>(({ className, ...props }, ref) => (
	<textarea
		ref={ref}
		className={cn(
			"w-full min-h-[96px] rounded-none border-2 border-inkNavy bg-formWhite px-4 py-2 text-[15px] font-mono text-inkNavy placeholder:text-midGray",
			"focus-visible:border-officialRed focus-visible:outline-none",
			className
		)}
		{...props}
	/>
));
OfficialTextarea.displayName = "OfficialTextarea";

export type OfficialSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const OfficialSelect = React.forwardRef<
	HTMLSelectElement,
	OfficialSelectProps
>(({ className, children, ...props }, ref) => (
	<select
		ref={ref}
		className={cn(
			"w-full rounded-none border-2 border-inkNavy bg-formWhite px-4 py-2 text-[15px] font-mono text-inkNavy",
			"focus-visible:border-officialRed focus-visible:outline-none",
			className
		)}
		{...props}
	>
		{children}
	</select>
));
OfficialSelect.displayName = "OfficialSelect";
