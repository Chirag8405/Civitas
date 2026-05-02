import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SYSTEM_PROMPT } from "@/lib/gemini";
import { z } from "zod";
import { GEMINI_RATE_LIMIT } from "@/lib/constants";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.string(),
    })
  ),
  context: z.object({
    phase: z.string(),
    constituency: z.string(),
  }).passthrough().optional(),
});

/** In-memory store for rate limiting Gemini requests. */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/** Checks if a user has exceeded the Gemini API request limit. */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + 60000,
    });
    return true;
  }

  if (userLimit.count >= GEMINI_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(session.user.email)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      );
    }

    const { messages, context } = result.data;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (context) {
      systemPrompt += `\n\n[CURRENT CONTEXT]\nPhase: ${context.phase}\nConstituency: ${context.constituency}`;
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      console.error("[gemini] Gemini API error:", error);
      return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
    }

    const data = await geminiResponse.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated";
    const advisoryRef = `CE-${Math.random().toString().slice(2, 6)}`;

    return NextResponse.json({
      role: "assistant",
      content: responseText,
      advisoryRef,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gemini] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
