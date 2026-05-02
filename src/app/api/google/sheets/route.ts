import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { TOTAL_VOTERS } from "@/lib/constants";

const requestSchema = z.object({
  constituencyName: z.string().min(1),
  country: z.string().optional(),
  zones: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

/**
 * Generates a synthetic voter roll for simulation.
 */
function generateVoterRoll(constituencyName: string, zones: { id: string; name: string }[]): string[][] {
  const firstNames = ["Arjun", "Priya", "Ravi", "Sunita", "Vijay", "Meena", "Kiran", "Deepa", "Suresh", "Anita"];
  const lastNames = ["Kumar", "Sharma", "Patel", "Singh", "Reddy", "Nair", "Iyer", "Rao", "Shah", "Verma"];
  const streets = ["MG Road", "Gandhi Nagar", "Nehru Street", "Rajaji Lane", "Anna Salai"];

  const zoneIds = zones.length > 0 ? zones.map((z) => z.id) : ["z1", "z2", "z3"];
  const rows: string[][] = [["Voter ID", "Full Name", "Address", "Zone ID", "Zone Name", "Age", "Status"]];

  for (let i = 1; i <= TOTAL_VOTERS; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const zoneIndex = Math.floor(Math.random() * zoneIds.length);
    const zoneId = zoneIds[zoneIndex];
    const zoneName = zones[zoneIndex]?.name ?? `Zone ${zoneIndex + 1}`;

    rows.push([
      `${constituencyName.slice(0, 3).toUpperCase()}-${String(i).padStart(4, "0")}`,
      `${fn} ${ln}`,
      `${Math.floor(Math.random() * 500) + 1}, ${street}, ${constituencyName}`,
      zoneId,
      zoneName,
      String(Math.floor(Math.random() * 60) + 18),
      "REGISTERED",
    ]);
  }
  return rows;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request body", details: result.error.issues }, { status: 400 });
    }

    const { constituencyName, country, zones = [] } = result.data;
    const accessToken = (session as { accessToken?: string })?.accessToken;

    if (!accessToken) {
      return NextResponse.json({
        sheetUrl: null,
        voterCount: TOTAL_VOTERS,
        mock: true,
        zones: zones.map((z) => ({ id: z.id, name: z.name, voterCount: Math.floor(TOTAL_VOTERS / (zones.length || 1)) })),
      });
    }

    const sheetTitle = `${constituencyName} — Official Voter Roll`;
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: sheetTitle }, sheets: [{ properties: { title: "Voter Roll" } }] }),
    });

    if (!createRes.ok) {
      throw new Error("Failed to create Google Sheet");
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const rows = generateVoterRoll(constituencyName, zones);
    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Voter%20Roll!A1?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range: "Voter Roll!A1", majorDimension: "ROWS", values: rows }),
    });

    if (!writeRes.ok) {
      throw new Error("Sheet created but data write failed");
    }

    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => { });

    const voterRows = rows.slice(1);
    const zoneBreakdown = zones.map((z) => ({
      id: z.id,
      name: z.name,
      voterCount: voterRows.filter((r) => r[3] === z.id).length,
    }));

    return NextResponse.json({ sheetUrl, spreadsheetId, voterCount: voterRows.length, zones: zoneBreakdown, country });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sheets] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
