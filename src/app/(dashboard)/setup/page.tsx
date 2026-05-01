"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "IN", name: "India", system: "FPTP" },
  { code: "US", name: "United States", system: "Electoral College" },
  { code: "GB", name: "United Kingdom", system: "FPTP" },
  { code: "AU", name: "Australia", system: "Preferential" },
];

type SetupStep = "country" | "neighbourhood" | "system";

export default function SetupPage() {
  const router = useRouter();
  const { constituency, updateConstituency } = useSimulationStore();
  const [step, setStep] = useState<SetupStep>("country");
  const [selectedCountry, setSelectedCountry] = useState(
    constituency.country || ""
  );
  const [neighbourhood, setNeighbourhood] = useState(
    constituency.name || ""
  );
  const [systemInfo, setSystemInfo] = useState(
    constituency.electoralSystemInfo || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setError("");
  };

  const handleNeighbourhoodInput = (value: string) => {
    setNeighbourhood(value);
    setError("");
  };

  const fetchElectoralSystemInfo = useCallback(async () => {
    if (!selectedCountry || !neighbourhood.trim()) {
      setError("Please select a country and enter a neighbourhood.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/election/system-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: selectedCountry,
          neighbourhood: neighbourhood.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch system info: ${response.statusText}`);
      }

      const data = await response.json();
      setSystemInfo({
        system: data.system || "First Past the Post",
        registrationRules: data.registrationRules || "Standard voter registration required",
        boothRequirements: data.boothRequirements || "Standard polling booth setup",
      });

      setStep("system");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching system information");
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, neighbourhood]);

  const handleConfirmSetup = () => {
    if (systemInfo) {
      updateConstituency({
        country: selectedCountry,
        name: neighbourhood,
        electoralSystemInfo: systemInfo,
      });
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen bg-paperCream">
      <Sidebar
        active="setup"
        lockedActs={[]}
        userName="Administrator"
        userRole="Setup"
        avatarUrl=""
        onSignOut={() => router.push("/login")}
      />

      <main className="ml-60 flex-1 p-12">
        <PageHeader
          title="Electoral Setup"
          subtitle="Configure your constituency and election parameters"
          badge={{ label: "SETUP", variant: "default" }}
        />

        <div className="mt-12 max-w-2xl">
          {/* Step 1: Country Selection */}
          {step === "country" && (
            <OfficialCard className="p-8">
              <h2 className="font-serif text-2xl font-bold text-inkNavy mb-6">
                Select Jurisdiction
              </h2>
              <div className="space-y-3">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={cn(
                      "w-full text-left px-4 py-3 font-mono text-sm transition-colors",
                      selectedCountry === country.code
                        ? "bg-officialRed text-formWhite border-2 border-officialRed"
                        : "bg-formWhite text-inkNavy border-2 border-midGray hover:bg-govGold hover:border-govGold"
                    )}
                  >
                    {country.name}
                    <span className="float-right text-xs uppercase tracking-widest">
                      {country.system}
                    </span>
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-4 text-officialRed font-mono text-sm">{error}</p>
              )}

              <button
                onClick={() => setStep("neighbourhood")}
                disabled={!selectedCountry}
                className={cn(
                  "mt-6 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest transition-colors",
                  selectedCountry
                    ? "bg-govGold text-inkNavy hover:bg-officialRed hover:text-formWhite border-2 border-inkNavy"
                    : "bg-midGray text-ruleGray border-2 border-ruleGray cursor-not-allowed"
                )}
              >
                Next: Neighbourhood
              </button>
            </OfficialCard>
          )}

          {/* Step 2: Neighbourhood Input */}
          {step === "neighbourhood" && (
            <OfficialCard className="p-8">
              <h2 className="font-serif text-2xl font-bold text-inkNavy mb-2">
                Define Your Neighbourhood
              </h2>
              <p className="font-mono text-sm text-midGray mb-6">
                Enter the name or description of your electoral constituency
              </p>

              <FormField label="Neighbourhood Name">
                <input
                  type="text"
                  value={neighbourhood}
                  onChange={(e) => handleNeighbourhoodInput(e.target.value)}
                  placeholder="e.g., Downtown East, Ward 7, District Central"
                  className="w-full px-3 py-2 font-mono text-sm border-2 border-inkNavy bg-formWhite text-inkNavy"
                />
              </FormField>

              {error && (
                <p className="mt-4 text-officialRed font-mono text-sm">{error}</p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("country")}
                  className="px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest border-2 border-inkNavy bg-formWhite text-inkNavy hover:bg-ruleGray"
                >
                  Back
                </button>
                <button
                  onClick={fetchElectoralSystemInfo}
                  disabled={loading || !neighbourhood.trim()}
                  className={cn(
                    "px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest transition-colors flex-1",
                    loading || !neighbourhood.trim()
                      ? "bg-midGray text-ruleGray border-2 border-ruleGray cursor-not-allowed"
                      : "bg-govGold text-inkNavy hover:bg-officialRed hover:text-formWhite border-2 border-inkNavy"
                  )}
                >
                  {loading ? "Fetching..." : "Fetch System Info"}
                </button>
              </div>
            </OfficialCard>
          )}

          {/* Step 3: System Confirmation */}
          {step === "system" && systemInfo && (
            <OfficialCard className="p-8">
              <h2 className="font-serif text-2xl font-bold text-inkNavy mb-6">
                Electoral System Confirmed
              </h2>

              <div className="space-y-4 mb-6">
                <div className="border-2 border-inkNavy p-4 bg-formWhite">
                  <p className="font-mono text-xs uppercase tracking-widest text-midGray mb-1">
                    System
                  </p>
                  <p className="font-mono text-sm font-bold text-inkNavy">
                    {systemInfo.system}
                  </p>
                </div>

                <div className="border-2 border-inkNavy p-4 bg-formWhite">
                  <p className="font-mono text-xs uppercase tracking-widest text-midGray mb-1">
                    Registration Rules
                  </p>
                  <p className="font-mono text-sm text-inkNavy">
                    {systemInfo.registrationRules}
                  </p>
                </div>

                <div className="border-2 border-inkNavy p-4 bg-formWhite">
                  <p className="font-mono text-xs uppercase tracking-widest text-midGray mb-1">
                    Polling Booth Requirements
                  </p>
                  <p className="font-mono text-sm text-inkNavy">
                    {systemInfo.boothRequirements}
                  </p>
                </div>

                <div className="border-2 border-inkNavy p-4 bg-formWhite">
                  <p className="font-mono text-xs uppercase tracking-widest text-midGray mb-1">
                    Jurisdiction
                  </p>
                  <p className="font-mono text-sm font-bold text-inkNavy">
                    {neighbourhood}, {selectedCountry}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("neighbourhood")}
                  className="flex-1 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest border-2 border-inkNavy bg-formWhite text-inkNavy hover:bg-ruleGray"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmSetup}
                  className="flex-1 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest bg-officialRed text-formWhite border-2 border-officialRed hover:bg-govGold hover:text-inkNavy hover:border-govGold transition-colors"
                >
                  Confirm & Start
                </button>
              </div>
            </OfficialCard>
          )}
        </div>
      </main>
    </div>
  );
}
