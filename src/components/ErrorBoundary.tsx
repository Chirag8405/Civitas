"use client";
import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("Boundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="border-2 border-officialRed bg-stampRedBg p-8 font-mono text-sm text-officialRed">
          <p className="font-bold uppercase tracking-widest">SYSTEM ERROR</p>
          <p className="mt-2 text-xs">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
