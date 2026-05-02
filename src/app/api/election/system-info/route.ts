import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  country: z.string().min(1),
  neighbourhood: z.string().optional(),
});

type RequestData = z.infer<typeof requestSchema>;

interface ElectoralSystemResponse {
  system: string;
  registrationRules: string;
  boothRequirements: string;
  groundingSource?: string;
}

// Silent fallback — used only when Gemini call fails
const FALLBACK: Record<string, ElectoralSystemResponse> = {
  IN: {
    system: "First Past the Post (FPTP)",
    registrationRules:
      "All citizens aged 18+ with valid citizenship and local residence eligibility. Registration via Voter Rolls maintained by Election Commission of India under RPA 1950.",
    boothRequirements:
      "Minimum 1 booth per 1000 voters. Each booth equipped with EVMs, voter verification slips, and trained personnel per ECI guidelines.",
  },
  US: {
    system: "Electoral College System",
    registrationRules:
      "Citizens aged 18+ must register in their state. Registration closed 29 days before election. Voter ID requirements vary by state under NVRA 1993.",
    boothRequirements:
      "Varies by state and county. Typically 1 polling place per 2000–3000 voters. Voting machines and paper records as per HAVA 2002.",
  },
  GB: {
    system: "First Past the Post (FPTP)",
    registrationRules:
      "UK citizens and qualifying Commonwealth residents aged 18+ registered on the Electoral Register. Registration deadline 12 working days before election under RPA 1983.",
    boothRequirements:
      "One polling station per constituency. Multiple polling districts within constituency. Manual ballots per Electoral Commission standards.",
  },
  AU: {
    system: "Preferential Voting System",
    registrationRules:
      "Australian citizens aged 18+ must be on the Electoral Roll. Voting is compulsory under Commonwealth Electoral Act 1918.",
    boothRequirements:
      "Multiple polling places across electorate. Proportional to population. Each booth has ballot papers for preferential ranking per AEC guidelines.",
  },
};

async function fetchFromGemini(
  country: string,
  neighbourhood: string,
  apiKey: string
): Promise<ElectoralSystemResponse> {
  const prompt = `You are an expert in electoral law. For the country with ISO code "${country}" (neighbourhood context: "${neighbourhood}"), provide factual, legally accurate information in this exact JSON format:
{
  "system": "<system name>",
  "registrationRules": "<registration rules>",
  "boothRequirements": "<booth requirements>"
}
Use Google Search to ground your answer in current, official sources. 
Respond in valid JSON only. Keep all string values under 100 characters. No line breaks inside strings. Do not include any trailing text, markdown, or commentary.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Extract JSON from first { to last }
  let jsonText = rawText;
  const startIdx = rawText.indexOf("{");
  const endIdx = rawText.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    jsonText = rawText.slice(startIdx, endIdx + 1);
  } else {
    // Fallback strip
    jsonText = rawText.replace(/```(?:json)?\n?/g, "").trim();
  }

  let parsed: ElectoralSystemResponse;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`JSON Parse Error: ${(e as Error).message}. Raw: ${jsonText}`);
  }

  // Attach grounding source if present
  const groundingChunks =
    data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks?.length) {
    parsed.groundingSource = (groundingChunks[0]?.web as { uri?: string })?.uri ?? undefined;
  }

  return parsed;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      );
    }

    const { country, neighbourhood = "" } = result.data;

    const apiKey = process.env.GEMINI_API_KEY;

    // Attempt real Gemini Search Grounding call
    if (apiKey) {
      try {
        const result = await fetchFromGemini(
          country,
          neighbourhood,
          apiKey
        );
        return NextResponse.json(result);
      } catch (geminiErr) {
        console.warn(
          "[system-info] Gemini call failed, using fallback:",
          geminiErr
        );
      }
    } else {
      console.warn("[system-info] GOOGLE_GEMINI_API_KEY not set, using fallback");
    }

    // Silent fallback
    const fallback =
      FALLBACK[country] ??
      ({
        system: "Unknown electoral system",
        registrationRules:
          "Please consult your national electoral commission for registration requirements.",
        boothRequirements:
          "Please consult your national electoral commission for booth requirements.",
      } satisfies ElectoralSystemResponse);

    return NextResponse.json(fallback);
  } catch (error) {
    console.error("[system-info] Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system information" },
      { status: 500 }
    );
  }
}
