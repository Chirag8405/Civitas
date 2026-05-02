import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Milestone } from "@/types";
import { z } from "zod";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    country: z.string().min(1),
    electoralSystem: z.string().min(1),
  }),
  z.object({
    action: z.literal("create"),
    milestones: z.array(z.object({
      id: z.string(),
      date: z.string(),
      title: z.string(),
      description: z.string(),
      phase: z.enum(["registration", "campaign", "polling", "results"]),
      status: z.enum(["past", "current", "future"]),
    })),
    constituencyName: z.string().min(1),
  }),
]);

type RequestData = z.infer<typeof requestSchema>;

// ─── helpers ─────────────────────────────────────────────────────────────────
function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function rfc3339(dateStr: string): string {
  return `${dateStr}T09:00:00Z`;
}

// ─── POST /api/google/calendar ────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      );
    }

    const body = result.data;

    // ── GENERATE: Gemini Search Grounding → milestone JSON ─────────────────
    if (body.action === "generate") {
      const { country, electoralSystem } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "GOOGLE_GEMINI_API_KEY not set" },
          { status: 500 }
        );
      }

      const prompt = `You are an electoral law expert. For a simulated local constituency election in ${country} using the ${electoralSystem} system, starting from today (${todayPlus(0)}), generate a realistic election calendar with 8 milestones.

Return ONLY a valid JSON array (no markdown, no code fences) of objects with exactly these fields:
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "title": "string",
  "description": "string (one sentence, legal basis if applicable)",
  "phase": "registration" | "campaign" | "polling" | "results",
  "status": "past" | "current" | "future"
}

Use realistic dates spread over 45 days from today. First milestone should be "past", one "current", rest "future". Cite the specific legislation (Act / regulation) in descriptions where possible.`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!geminiRes.ok) {
        return NextResponse.json(
          { error: "Gemini call failed" },
          { status: 500 }
        );
      }

      const geminiData = await geminiRes.json();
      const rawText: string =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Strip markdown fences
      const jsonText = rawText.replace(/```(?:json)?\n?/g, "").trim();

      let milestones: Milestone[];
      try {
        milestones = JSON.parse(jsonText);
      } catch {
        // Fallback milestones
        milestones = [
          { id: "m1", date: todayPlus(-7), title: "Writ Issued", description: "Election writ issued by the Returning Officer.", phase: "registration", status: "past" },
          { id: "m2", date: todayPlus(0), title: "Nominations Open", description: "Candidate nomination period begins.", phase: "registration", status: "current" },
          { id: "m3", date: todayPlus(7), title: "Nominations Close", description: "Deadline for candidate nomination submissions.", phase: "registration", status: "future" },
          { id: "m4", date: todayPlus(10), title: "Scrutiny of Nominations", description: "Official review of nomination papers.", phase: "campaign", status: "future" },
          { id: "m5", date: todayPlus(14), title: "Campaign Period Begins", description: "Official campaign period commences.", phase: "campaign", status: "future" },
          { id: "m6", date: todayPlus(30), title: "Campaign Silence", description: "48-hour campaign silence period before polling.", phase: "campaign", status: "future" },
          { id: "m7", date: todayPlus(32), title: "Polling Day", description: "Official polling day. Booths open 08:00–18:00.", phase: "polling", status: "future" },
          { id: "m8", date: todayPlus(35), title: "Results Declaration", description: "Official declaration of results by the Returning Officer.", phase: "results", status: "future" },
        ];
      }

      return NextResponse.json({ milestones });
    }

    // ── CREATE: Google Calendar API v3 event series ────────────────────────
    if (body.action === "create") {
      const { milestones, constituencyName } = body;
      const accessToken = (session as { accessToken?: string })?.accessToken;

      if (!accessToken) {
        return NextResponse.json({
          mock: true,
          calendarId: "primary",
          eventCount: milestones.length,
          message: "No Google access token. Re-authenticate to sync real calendar events.",
        });
      }

      const createdEventIds: string[] = [];

      for (const m of milestones) {
        const eventRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: `[CIVITAS] ${m.title}`,
              description: `${m.description ?? ""}\n\nConstituency: ${constituencyName}\nPhase: ${m.phase.toUpperCase()}\n\nGenerated by CIVITAS Electoral Simulator`,
              start: { dateTime: rfc3339(m.date), timeZone: "UTC" },
              end: { dateTime: rfc3339(m.date).replace("09:00", "10:00"), timeZone: "UTC" },
              colorId: m.phase === "polling" ? "11" : m.phase === "results" ? "5" : "9",
            }),
          }
        );
        if (eventRes.ok) {
          const ev = await eventRes.json();
          createdEventIds.push(ev.id);
        }
      }

      return NextResponse.json({
        calendarId: "primary",
        eventCount: createdEventIds.length,
        eventIds: createdEventIds,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[calendar] Unhandled error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
