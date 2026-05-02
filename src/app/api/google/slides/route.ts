import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { constituencyName, candidateCounts, winner } = body;
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!constituencyName) {
      return NextResponse.json({ error: "Missing constituency name" }, { status: 400 });
    }

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
    const slide1Id = slidesData.slides[0].objectId; // real ID from API response
    const slidesUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    // Step 2 — First batchUpdate: create slides 2, 3, 4 ONLY
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
      console.error("Create slides failed:", err);
    }

    // Step 3 — Second batchUpdate: add all text content
    const contentRequests = [
      // Slide 1 background
      {
        updatePageProperties: {
          objectId: slide1Id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.102, green: 0.102, blue: 0.18 } } } } },
          fields: "pageBackgroundFill.solidFill.color"
        }
      },
      // Slides 2,3,4 backgrounds
      ...["slide2", "slide3", "slide4"].map(id => ({
        updatePageProperties: {
          objectId: id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.102, green: 0.102, blue: 0.18 } } } } },
          fields: "pageBackgroundFill.solidFill.color"
        }
      })),
      // Slide 1 title textbox
      { createShape: { objectId: "s1title", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slide1Id, size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 80, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 80, unit: "PT" } } } },
      { insertText: { objectId: "s1title", insertionIndex: 0, text: "OFFICIAL RESULTS DECLARATION" } },
      { updateTextStyle: { objectId: "s1title", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 28, unit: "PT" }, bold: true }, fields: "foregroundColor,fontSize,bold" } },
      // Slide 1 subtitle
      { createShape: { objectId: "s1sub", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slide1Id, size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 120, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 180, unit: "PT" } } } },
      { insertText: { objectId: "s1sub", insertionIndex: 0, text: `${constituencyName}\nDate: ${new Date().toLocaleDateString()}\nReturning Officer: ${session.user.name ?? "Unknown"}` } },
      { updateTextStyle: { objectId: "s1sub", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 18, unit: "PT" } }, fields: "foregroundColor,fontSize" } },
      // Slide 2 results header
      { createShape: { objectId: "s2title", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "slide2", size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 60, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 40, unit: "PT" } } } },
      { insertText: { objectId: "s2title", insertionIndex: 0, text: "VOTE COUNT — OFFICIAL RESULTS" } },
      { updateTextStyle: { objectId: "s2title", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 22, unit: "PT" }, bold: true }, fields: "foregroundColor,fontSize,bold" } },
      // Slide 2 results body — one textbox per candidate
      ...candidateCounts.map((c: any, i: number) => [
        { createShape: { objectId: `s2cand${i}`, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "slide2", size: { width: { magnitude: 580, unit: "PT" }, height: { magnitude: 40, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 120 + i * 50, unit: "PT" } } } },
        { insertText: { objectId: `s2cand${i}`, insertionIndex: 0, text: `${c.name}  |  ${c.party}  |  ${c.votes} votes` } },
        { updateTextStyle: { objectId: `s2cand${i}`, textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 16, unit: "PT" } }, fields: "foregroundColor,fontSize" } },
      ]).flat(),
      // Slide 3 winner
      { createShape: { objectId: "s3label", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "slide3", size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 60, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 80, unit: "PT" } } } },
      { insertText: { objectId: "s3label", insertionIndex: 0, text: "ELECTED MEMBER" } },
      { updateTextStyle: { objectId: "s3label", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.83, green: 0.64, blue: 0.1 } } }, fontSize: { magnitude: 20, unit: "PT" }, bold: true }, fields: "foregroundColor,fontSize,bold" } },
      { createShape: { objectId: "s3winner", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "slide3", size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 100, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 160, unit: "PT" } } } },
      { insertText: { objectId: "s3winner", insertionIndex: 0, text: `${winner?.name ?? "N/A"}\n${winner?.party ?? ""}` } },
      { updateTextStyle: { objectId: "s3winner", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 36, unit: "PT" }, bold: true }, fields: "foregroundColor,fontSize,bold" } },
      // Slide 4 certification
      { createShape: { objectId: "s4cert", shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "slide4", size: { width: { magnitude: 580, unit: "PT" }, height: { magnitude: 200, unit: "PT" } }, transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 120, unit: "PT" } } } },
      { insertText: { objectId: "s4cert", insertionIndex: 0, text: `I hereby certify that the above results are true and accurate.\n\nSigned: ${session.user.name ?? "Returning Officer"}\nDate: ${new Date().toLocaleDateString()}\nConstituency: ${constituencyName}` } },
      { updateTextStyle: { objectId: "s4cert", textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: { red: 0.96, green: 0.94, blue: 0.91 } } }, fontSize: { magnitude: 18, unit: "PT" } }, fields: "foregroundColor,fontSize" } },
    ];

    const contentRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: contentRequests }),
    });
    if (!contentRes.ok) {
      const err = await contentRes.json();
      console.error("Content batchUpdate failed:", err);
    }

    // Share with user
    await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => { });

    return NextResponse.json({ slidesUrl });
  } catch (err: any) {
    console.error("Slides error:", err);
    return NextResponse.json({ error: "Failed to generate slides: " + err.message }, { status: 500 });
  }
}
