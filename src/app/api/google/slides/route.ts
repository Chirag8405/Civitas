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

    if (!createRes.ok) throw new Error("Failed to create presentation");
    const slidesData = await createRes.json();
    const presentationId = slidesData.presentationId;
    const slidesUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    const navy = { opaqueColor: { rgbColor: { blue: 0.18, green: 0.1, red: 0.1 } } }; // #1A1A2E approx
    const cream = { opaqueColor: { rgbColor: { blue: 0.91, green: 0.94, red: 0.96 } } }; // #F5F0E8 approx

    const requests: any[] = [
      // Create Slides
      { createSlide: { objectId: "slide2" } },
      { createSlide: { objectId: "slide3" } },
      { createSlide: { objectId: "slide4" } },

      // Backgrounds for all 4 slides
      ...["p", "slide2", "slide3", "slide4"].map(id => ({
        updatePageProperties: {
          objectId: id === "p" ? slidesData.slides[0].objectId : id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: navy } } },
          fields: "pageBackgroundFill.solidFill.color"
        }
      })),

      // Slide 1: Header
      {
        createShape: {
          objectId: "title1",
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slidesData.slides[0].objectId,
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 100, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 100, unit: "PT" }
          }
        }
      },
      { insertText: { objectId: "title1", text: "OFFICIAL RESULTS DECLARATION" } },
      {
        updateTextStyle: {
          objectId: "title1",
          style: { foregroundColor: cream, fontSize: { magnitude: 36, unit: "PT" }, bold: true },
          fields: "foregroundColor,fontSize,bold"
        }
      },
      {
        createShape: {
          objectId: "subtitle1",
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slidesData.slides[0].objectId,
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 100, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 200, unit: "PT" }
          }
        }
      },
      { insertText: { objectId: "subtitle1", text: `${constituencyName}\nDate: ${new Date().toLocaleDateString()}\nReturning Officer: ${session.user.name}` } },
      {
        updateTextStyle: {
          objectId: "subtitle1",
          style: { foregroundColor: cream, fontSize: { magnitude: 18, unit: "PT" } },
          fields: "foregroundColor,fontSize"
        }
      },

      // Slide 2: Table
      {
        createTable: {
          objectId: "resultsTable",
          elementProperties: {
            pageObjectId: "slide2",
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 300, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 50, unit: "PT" }
          },
          rows: candidateCounts.length + 1,
          columns: 3
        }
      },
      { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: 0, columnIndex: 0 }, text: "Candidate" } },
      { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: 0, columnIndex: 1 }, text: "Party" } },
      { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: 0, columnIndex: 2 }, text: "Votes" } },
      ...candidateCounts.flatMap((c: any, i: number) => [
        { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: i + 1, columnIndex: 0 }, text: c.name } },
        { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: i + 1, columnIndex: 1 }, text: c.party } },
        { insertText: { objectId: "resultsTable", cellLocation: { rowIndex: i + 1, columnIndex: 2 }, text: String(c.votes) } }
      ]),
      // Style table text (best effort)
      {
        updateTableCellStyle: {
          objectId: "resultsTable",
          tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: candidateCounts.length + 1, columnSpan: 3 },
          tableCellStyle: { backgroundColor: navy },
          fields: "backgroundColor"
        }
      },

      // Slide 3: Winner
      {
        createShape: {
          objectId: "winnerTitle",
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: "slide3",
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 100, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 100, unit: "PT" }
          }
        }
      },
      { insertText: { objectId: "winnerTitle", text: "ELECTED MEMBER" } },
      {
        updateTextStyle: {
          objectId: "winnerTitle",
          style: { foregroundColor: cream, fontSize: { magnitude: 48, unit: "PT" }, bold: true },
          fields: "foregroundColor,fontSize,bold"
        }
      },
      {
        createShape: {
          objectId: "winnerName",
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: "slide3",
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 100, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 200, unit: "PT" }
          }
        }
      },
      { insertText: { objectId: "winnerName", text: `${winner?.name || "N/A"}\n${winner?.party || ""}` } },
      {
        updateTextStyle: {
          objectId: "winnerName",
          style: { foregroundColor: cream, fontSize: { magnitude: 36, unit: "PT" } },
          fields: "foregroundColor,fontSize"
        }
      },

      // Slide 4: Certification
      {
        createShape: {
          objectId: "certText",
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: "slide4",
            size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 200, unit: "PT" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 150, unit: "PT" }
          }
        }
      },
      { insertText: { objectId: "certText", text: `I hereby certify that the above results are true and accurate to the best of my knowledge.\n\nSigned: ${session.user.name}\nDate: ${new Date().toLocaleDateString()}` } },
      {
        updateTextStyle: {
          objectId: "certText",
          style: { foregroundColor: cream, fontSize: { magnitude: 20, unit: "PT" } },
          fields: "foregroundColor,fontSize"
        }
      }
    ];

    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });

    // Share with user
    await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => {});

    return NextResponse.json({ slidesUrl });
  } catch (err: any) {
    console.error("Slides error:", err);
    return NextResponse.json({ error: "Failed to generate slides: " + err.message }, { status: 500 });
  }
}
