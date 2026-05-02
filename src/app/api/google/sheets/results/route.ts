import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

const requestSchema = z.object({
  constituencyName: z.string().min(1),
  candidateCounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    party: z.string(),
    votes: z.number(),
  })),
  winner: z.object({
    id: z.string(),
    name: z.string(),
    party: z.string(),
    votes: z.number(),
  }).nullable(),
});

type RequestData = z.infer<typeof requestSchema>;

export async function POST(req: NextRequest) {
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

    const { constituencyName, candidateCounts, winner } = result.data;
    const accessToken = (session as { accessToken?: string })?.accessToken;

    if (!accessToken) {
      return NextResponse.json({
        sheetUrl: "https://docs.google.com/spreadsheets/d/mock-sheet-id/edit",
        mock: true,
      });
    }

    const sheetTitle = `${constituencyName} — Official Results`;
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: { title: sheetTitle } }),
    });

    if (!createRes.ok) throw new Error("Failed to create sheet");
    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const rows = [
      ["Candidate Name", "Party", "Votes"],
      ...candidateCounts.map((c) => [c.name, c.party, String(c.votes)]),
      [],
      ["Winner:", winner?.name || "N/A"],
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ range: "Sheet1!A1", majorDimension: "ROWS", values: rows }),
    });

    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => {});

    return NextResponse.json({ sheetUrl });
  } catch (err: unknown) {
    console.error("Sheets results error:", err);
    return NextResponse.json({ error: "Failed to generate results sheet" }, { status: 500 });
  }
}
