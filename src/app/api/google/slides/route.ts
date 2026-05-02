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

/**
 * Builds a Slides API batchUpdate request for creating a text box with styled text.
 */
function buildTextBoxRequest(objectId: string, pageId: string, text: string, x: number, y: number, w: number, h: number, fontSize = 14, bold = false, color = { red: 0.96, green: 0.94, blue: 0.91 }) {
  return [
    {
      createShape: {
        objectId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: w, unit: "PT" }, height: { magnitude: h, unit: "PT" } },
          transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: "PT" }
        }
      }
    },
    { insertText: { objectId, insertionIndex: 0, text } },
    {
      updateTextStyle: {
        objectId,
        textRange: { type: "ALL" },
        style: {
          foregroundColor: { opaqueColor: { rgbColor: color } },
          fontSize: { magnitude: fontSize, unit: "PT" },
          bold
        },
        fields: "foregroundColor,fontSize,bold"
      }
    }
  ];
}

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
        slidesUrl: "https://docs.google.com/presentation/d/mock-slides-id/edit",
        mock: true,
      });
    }

    const title = `${constituencyName} — Official Results`;
    const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const slidesData = await createRes.json();
    const presentationId = slidesData.presentationId;
    const slide1Id = slidesData.slides[0].objectId;
    const slidesUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    const createSlidesRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          { createSlide: { objectId: "slide2", insertionIndex: 1 } },
          { createSlide: { objectId: "slide3", insertionIndex: 2 } },
          { createSlide: { objectId: "slide4", insertionIndex: 3 } },
        ]
      }),
    });
    if (!createSlidesRes.ok) {
      const err = await createSlidesRes.json();
      console.error("[slides] Create slides failed:", err);
    }

    const contentRequests = [
      {
        updatePageProperties: {
          objectId: slide1Id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.102, green: 0.102, blue: 0.18 } } } } },
          fields: "pageBackgroundFill.solidFill.color"
        }
      },
      ...["slide2", "slide3", "slide4"].map(id => ({
        updatePageProperties: {
          objectId: id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.102, green: 0.102, blue: 0.18 } } } } },
          fields: "pageBackgroundFill.solidFill.color"
        }
      })),
      ...buildTextBoxRequest("s1title", slide1Id, "OFFICIAL RESULTS DECLARATION", 50, 80, 600, 80, 28, true),
      ...buildTextBoxRequest("s1sub", slide1Id, `${constituencyName}\nDate: ${new Date().toLocaleDateString()}\nReturning Officer: ${session.user.name ?? "Unknown"}`, 50, 180, 600, 120, 18),
      ...buildTextBoxRequest("s2title", "slide2", "VOTE COUNT — OFFICIAL RESULTS", 50, 40, 600, 60, 22, true),
      ...candidateCounts.flatMap((c, i) => buildTextBoxRequest(`s2cand${i}`, "slide2", `${c.name}  |  ${c.party}  |  ${c.votes} votes`, 50, 120 + i * 50, 580, 40, 16)),
      ...buildTextBoxRequest("s3label", "slide3", "ELECTED MEMBER", 50, 80, 600, 60, 20, true, { red: 0.83, green: 0.64, blue: 0.1 }),
      ...buildTextBoxRequest("s3winner", "slide3", `${winner?.name ?? "N/A"}\n${winner?.party ?? ""}`, 50, 160, 600, 100, 36, true),
      ...buildTextBoxRequest("s4cert", "slide4", `I hereby certify that the above results are true and accurate.\n\nSigned: ${session.user.name ?? "Returning Officer"}\nDate: ${new Date().toLocaleDateString()}\nConstituency: ${constituencyName}`, 50, 120, 580, 200, 18),
    ];

    const contentRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: contentRequests }),
    });
    if (!contentRes.ok) {
      const err = await contentRes.json();
      console.error("[slides] Content batchUpdate failed:", err);
    }

    await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => { });

    return NextResponse.json({ slidesUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[slides] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
