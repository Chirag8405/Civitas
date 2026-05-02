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

    // Slide 1 is created by default. We add 3 more slides.
    const requests = [
      { createSlide: { objectId: "slide2" } },
      { createSlide: { objectId: "slide3" } },
      { createSlide: { objectId: "slide4" } },
    ];
    
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    }).catch(() => {});

    // Share with user
    await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: "reader", emailAddress: session.user.email }),
    }).catch(() => {});

    return NextResponse.json({ slidesUrl });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate slides" }, { status: 500 });
  }
}
