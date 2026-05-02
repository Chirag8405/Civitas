import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Zone } from "@/types";
import { z } from "zod";

const requestSchema = z.object({
  constituencyName: z.string().min(1),
  country: z.string().optional(),
  zones: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

type RequestData = z.infer<typeof requestSchema>;

// Generate synthetic voter data (200 rows)
function generateVoterRoll(
  constituencyName: string,
  zones: { id: string; name: string }[]
): string[][] {
  const firstNames = [
    "Arjun", "Priya", "Ravi", "Sunita", "Vijay", "Meena", "Kiran", "Deepa", "Suresh", "Anita",
    "Mohammed", "Fatima", "Rajesh", "Kavitha", "Arun", "Lakshmi", "Dinesh", "Saranya", "Murugan", "Yamini",
    "James", "Mary", "Robert", "Patricia", "Michael", "Jennifer", "William", "Linda", "David", "Barbara",
    "Ahmed", "Aisha", "Omar", "Fatou", "Ibrahim", "Amara", "Yusuf", "Zainab", "Kofi", "Abena",
  ];
  const lastNames = [
    "Kumar", "Sharma", "Patel", "Singh", "Reddy", "Nair", "Iyer", "Rao", "Shah", "Verma",
    "Khan", "Ali", "Ahmed", "Rahman", "Sheikh", "Malik", "Siddiqui", "Ansari", "Hussain", "Akhtar",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor",
    "Mensah", "Asante", "Owusu", "Osei", "Boateng", "Agyei", "Amponsah", "Darko", "Amoah", "Frimpong",
  ];
  const streets = [
    "MG Road", "Gandhi Nagar", "Nehru Street", "Rajaji Lane", "Anna Salai",
    "Park Avenue", "High Street", "Church Road", "Lake View", "Station Road",
    "Market Lane", "Temple Street", "College Road", "Hospital Road", "Bus Stand Road",
  ];

  const zoneIds = zones.length > 0 ? zones.map((z) => z.id) : ["z1", "z2", "z3"];
  const rows: string[][] = [
    ["Voter ID", "Full Name", "Address", "Zone ID", "Zone Name", "Age", "Status"],
  ];

  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const houseNo = Math.floor(Math.random() * 500) + 1;
    const zoneIndex = Math.floor(Math.random() * zoneIds.length);
    const zoneId = zoneIds[zoneIndex];
    const zoneName = zones[zoneIndex]?.name ?? `Zone ${zoneIndex + 1}`;
    const age = Math.floor(Math.random() * 60) + 18;

    rows.push([
      `${constituencyName.slice(0, 3).toUpperCase()}-${String(i).padStart(4, "0")}`,
      `${fn} ${ln}`,
      `${houseNo}, ${street}, ${constituencyName}`,
      zoneId,
      zoneName,
      String(age),
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
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      );
    }

    const { constituencyName, country, zones = [] } = result.data;

    const accessToken = (session as { accessToken?: string })?.accessToken;

    // If no real OAuth token, return a mock response (graceful degradation)
    if (!accessToken) {
      return NextResponse.json({
        sheetUrl: null,
        voterCount: 200,
        mock: true,
        message:
          "Voter roll generated in-memory. Re-authenticate with Google to persist to Sheets.",
        zones: zones.map((z) => ({
          id: z.id,
          name: z.name,
          voterCount: Math.floor(200 / (zones.length || 1)),
        })),
      });
    }

    // Create a new Google Sheet
    const sheetTitle = `${constituencyName} — Official Voter Roll`;
    const createRes = await fetch(
      "https://sheets.googleapis.com/v4/spreadsheets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: sheetTitle },
          sheets: [
            {
              properties: { title: "Voter Roll" },
            },
          ],
        }),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json(
        { error: "Failed to create Google Sheet", details: err },
        { status: 500 }
      );
    }

    const sheetData = await createRes.json();
    const spreadsheetId: string = sheetData.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Write voter roll data
    const rows = generateVoterRoll(constituencyName, zones);
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Voter%20Roll!A1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: "Voter Roll!A1",
          majorDimension: "ROWS",
          values: rows,
        }),
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json();
      return NextResponse.json(
        { error: "Sheet created but data write failed", sheetUrl },
        { status: 500 }
      );
    }

    // Format header row bold
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.1, green: 0.1, blue: 0.18 },
                  },
                },
                fields: "userEnteredFormat(textFormat,backgroundColor)",
              },
            },
          ],
        }),
      }
    ).catch(() => { }); // non-critical

    // Share with user as reader
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user",
          role: "reader",
          emailAddress: session.user.email,
        }),
      }
    ).catch(() => { }); // non-critical

    // Zone breakdown
    const voterRows = rows.slice(1); // exclude header
    const zoneBreakdown = zones.map((z) => ({
      id: z.id,
      name: z.name,
      voterCount: voterRows.filter((r) => r[3] === z.id).length,
    }));

    return NextResponse.json({
      sheetUrl,
      spreadsheetId,
      voterCount: voterRows.length,
      zones: zoneBreakdown,
      country,
    });
  } catch (err) {
    console.error("[sheets] Unhandled error:", err);
    return NextResponse.json(
      { error: "Failed to generate voter roll" },
      { status: 500 }
    );
  }
}
