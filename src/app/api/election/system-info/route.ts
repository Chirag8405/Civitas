import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  country: z.string().min(1),
  neighbourhood: z.string().optional(),
});

interface ElectoralSystemResponse {
  system: string;
  registrationRules: string;
  boothRequirements: string;
  groundingSource?: string;
}

const FALLBACK: Record<string, ElectoralSystemResponse> = {
  IN: {
    system: "First Past the Post (FPTP)",
    registrationRules: "All citizens aged 18+ with valid citizenship and local residence eligibility.",
    boothRequirements: "Minimum 1 booth per 1000 voters. Each booth equipped with EVMs.",
  },
  US: {
    system: "Electoral College System",
    registrationRules: "Citizens aged 18+ must register in their state.",
    boothRequirements: "Varies by state and county. Typically 1 polling place per 2000–3000 voters.",
  },
};

async function fetchFromGemini(country: string, neighbourhood: string, apiKey: string): Promise<ElectoralSystemResponse> {
  const prompt = `For country "${country}", provide factual electoral info in JSON: { "system", "registrationRules", "boothRequirements" }.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonText = rawText.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(jsonText);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request body", details: result.error.issues }, { status: 400 });
    }

    const { country, neighbourhood = "" } = result.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const info = await fetchFromGemini(country, neighbourhood, apiKey);
        return NextResponse.json(info);
      } catch (err) {
        console.warn("[system-info] Gemini failed, using fallback:", err);
      }
    }

    const fallback = FALLBACK[country] ?? {
      system: "Unknown",
      registrationRules: "Consult national commission.",
      boothRequirements: "Consult national commission.",
    };
    return NextResponse.json(fallback);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[system-info] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
