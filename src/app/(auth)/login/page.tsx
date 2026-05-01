"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await signIn("google", {
        redirect: true,
        callbackUrl: "/setup",
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("An error occurred during sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paperCream flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-inkNavy mb-2">
            CIVITAS
          </h1>
          <p className="font-mono text-sm uppercase tracking-widest text-midGray">
            Civic Election Administration System
          </p>
        </div>

        {/* Card */}
        <div className="border-4 border-inkNavy bg-formWhite">
          {/* Red Top Bar */}
          <div className="bg-officialRed h-8" />

          {/* Content */}
          <div className="p-12">
            <h2 className="font-serif text-2xl font-bold text-inkNavy mb-2">
              Election Officer Login
            </h2>
            <p className="font-mono text-sm text-midGray mb-8 uppercase tracking-widest">
              Sign in to administer your election
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-formWhite border-2 border-officialRed">
                <p className="font-mono text-sm text-officialRed">{error}</p>
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={cn(
                "w-full px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all",
                loading
                  ? "bg-midGray text-ruleGray border-2 border-ruleGray cursor-not-allowed"
                  : "bg-govGold text-inkNavy border-2 border-inkNavy hover:bg-officialRed hover:text-formWhite hover:border-officialRed"
              )}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In with Google"
              )}
            </button>

            {/* Divider */}
            <div className="my-8 relative">
              <div className="border-t-2 border-ruleGray" />
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-formWhite px-4 font-mono text-xs text-midGray uppercase">
                Or
              </span>
            </div>

            {/* Demo Button */}
            <button
              onClick={() => {
                setLoading(true);
                window.location.href = "/setup";
              }}
              className="w-full px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest bg-formWhite text-inkNavy border-2 border-inkNavy hover:bg-ruleGray transition-colors"
            >
              Continue as Demo User
            </button>

            {/* Footer */}
            <div className="mt-8 pt-8 border-t-2 border-ruleGray">
              <p className="font-mono text-xs text-midGray text-center">
                This application is part of the CIVITAS election education
                initiative.
              </p>
              <p className="font-mono text-xs text-midGray text-center mt-3">
                <span className="font-bold">Your responsibility:</span> Run a
                fair, inclusive election.
              </p>
            </div>
          </div>
        </div>

        {/* Official Seal Watermark */}
        <div className="mt-8 text-center opacity-5">
          <p className="font-serif text-8xl font-bold">🏛️</p>
        </div>
      </div>
    </div>
  );
}
