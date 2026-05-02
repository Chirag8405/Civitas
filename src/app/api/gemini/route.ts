import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SYSTEM_PROMPT } from "@/lib/gemini";
import { z } from "zod";

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

type RequestData = z.infer<typeof requestSchema>;

const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
};

// Simple in-memory rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
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

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (context) {
      systemPrompt += `\n\n[CURRENT CONTEXT]\nPhase: ${context.phase}\nConstituency: ${context.constituency}`;
    }

    // Format messages for Gemini API
    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate response from AI advisor" },
        { status: 500 }
      );
    }

    const data = await geminiResponse.json();

    // Extract response text
    let responseText = "";
    if (
      data.candidates &&
      data.candidates[0]?.content?.parts?.[0]?.text
    ) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    // Generate advisory reference number
    const advisoryRef = `CE-${Math.random().toString().slice(2, 6)}`;

    return NextResponse.json({
      role: "assistant",
      content: responseText,
      advisoryRef,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Gemini API route:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
