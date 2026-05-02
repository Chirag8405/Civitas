import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  texts: z.record(z.string(), z.string()), // fieldId → text
  targetLanguage: z.string().min(1),
});

import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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

    const { texts, targetLanguage } = result.data;

    const apiKey = process.env.GOOGLE_TRANSLATION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_TRANSLATION_API_KEY not set" },
        { status: 500 }
      );
    }

    const fieldIds = Object.keys(texts);
    const sourceTexts = Object.values(texts);

    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: sourceTexts,
          target: targetLanguage,
          format: "text",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("[translate] API error:", err);
      return NextResponse.json(
        { error: "Translation API failed", details: err },
        { status: 500 }
      );
    }

    const data = await res.json();
    const translations: Record<string, string> = {};
    data.data.translations.forEach(
      (t: { translatedText: string }, i: number) => {
        translations[fieldIds[i]] = t.translatedText;
      }
    );

    return NextResponse.json({ translations, targetLanguage });
  } catch (err) {
    console.error("[translate] Unhandled error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
