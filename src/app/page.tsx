import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata = {
  title: "CIVITAS — Civic Election Simulator",
  description:
    "Become the Returning Officer of a simulated micro-election. Configure your constituency, run the ballot, and certify results using real Google services.",
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  // Unauthenticated — render the landing page (redirect to /login on CTA)
  return (
    <main className="min-h-screen bg-paperCream flex flex-col">
      {/* ── Top rule ─────────────────────────────────────────────────────── */}
      <div className="h-1 w-full bg-officialRed" />

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <header className="border-b-2 border-inkNavy bg-formWhite px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Seal */}
          <svg
            viewBox="0 0 48 48"
            className="h-10 w-10 text-inkNavy"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
            <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M24 8 L26 16 L34 16 L28 21 L30 29 L24 24 L18 29 L20 21 L14 16 L22 16 Z"
              fill="currentColor"
              opacity="0.15"
            />
            <text
              x="24"
              y="37"
              textAnchor="middle"
              fontSize="5"
              fontFamily="monospace"
              fill="currentColor"
              letterSpacing="1"
            >
              CIVITAS
            </text>
          </svg>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-midGray leading-none">
              Electoral Commission
            </p>
            <p className="font-serif text-lg font-bold text-inkNavy leading-tight">
              CIVITAS
            </p>
          </div>
        </div>

        <a
          href="/login"
          className="border-2 border-inkNavy px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-inkNavy hover:bg-inkNavy hover:text-formWhite transition-colors"
        >
          Sign In →
        </a>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        {/* Reference number */}
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-midGray mb-6">
          Official Ref: ECI/SIM/2024/001
        </p>

        {/* Title block */}
        <div className="border-2 border-inkNavy bg-formWhite px-12 py-10 max-w-2xl w-full relative">
          {/* Corner marks */}
          {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
            <span
              key={pos}
              className={`absolute ${pos} w-3 h-3 border-inkNavy`}
              style={{
                borderTop: pos.includes("top") ? "2px solid" : "none",
                borderBottom: pos.includes("bottom") ? "2px solid" : "none",
                borderLeft: pos.includes("left") ? "2px solid" : "none",
                borderRight: pos.includes("right") ? "2px solid" : "none",
              }}
            />
          ))}

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-officialRed mb-3">
            PromptWars · Google · Civic Education
          </p>

          <h1 className="font-serif text-5xl font-bold text-inkNavy leading-tight">
            You are the<br />
            <span className="text-officialRed">Returning Officer.</span>
          </h1>

          <p className="font-mono text-sm text-midGray mt-6 leading-relaxed max-w-md mx-auto">
            Configure a real constituency. Run a real election calendar.
            Certify results on Google Sheets. All three acts of democratic
            process — in your hands.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="bg-officialRed border-2 border-officialRed px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-formWhite hover:bg-inkNavy hover:border-inkNavy transition-colors"
            >
              Begin Your Mandate →
            </a>
            <a
              href="#how-it-works"
              className="border-2 border-inkNavy px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-inkNavy hover:bg-govGold hover:border-govGold transition-colors"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Classification notice */}
        <p className="mt-6 font-mono text-[10px] text-midGray uppercase tracking-widest">
          Simulation only · No real votes are cast · For educational purposes
        </p>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t-2 border-inkNavy bg-formWhite px-12 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-midGray text-center mb-10">
          Three Acts · Real Google APIs · Official Process
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 max-w-4xl mx-auto border-2 border-inkNavy">
          {[
            {
              act: "ACT I",
              title: "Constituency Setup",
              desc: "Draw your boundary on Google Maps. Place polling booths. Generate an official voter roll in Google Sheets.",
              tools: "Maps · Sheets · Gemini",
            },
            {
              act: "ACT II",
              title: "Calendar & Ballot",
              desc: "Set election milestones in Google Calendar. Register candidates via Forms. Design a multilingual ballot.",
              tools: "Calendar · Forms · Translate",
            },
            {
              act: "ACT III",
              title: "Polling & Results",
              desc: "Conduct the vote, resolve disputes, and certify results in a Google Slides declaration.",
              tools: "Slides · Looker · Firestore",
            },
          ].map((act, i) => (
            <div
              key={act.act}
              className="p-8 border-l-2 border-inkNavy first:border-l-0"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 border-2 border-officialRed flex items-center justify-center shrink-0">
                  <span className="font-mono text-[10px] font-bold text-officialRed">{i + 1}</span>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-officialRed">
                    {act.act}
                  </p>
                  <p className="font-serif text-base font-bold text-inkNavy leading-tight">
                    {act.title}
                  </p>
                </div>
              </div>
              <p className="font-mono text-xs text-midGray leading-relaxed mb-4">{act.desc}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-govGold">
                {act.tools}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/login"
            className="inline-block bg-inkNavy border-2 border-inkNavy px-10 py-3 font-mono text-sm font-bold uppercase tracking-widest text-formWhite hover:bg-officialRed hover:border-officialRed transition-colors"
          >
            Sign In with Google →
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t-2 border-inkNavy bg-paperCream px-12 py-6 flex items-center justify-between">
        <p className="font-mono text-[10px] text-midGray uppercase tracking-widest">
          CIVITAS · Electoral Commission Simulation
        </p>
        <p className="font-mono text-[10px] text-midGray uppercase tracking-widest">
          Built for PromptWars · Google
        </p>
      </footer>

      {/* ── Bottom rule ──────────────────────────────────────────────────── */}
      <div className="h-1 w-full bg-officialRed" />
    </main>
  );
}
