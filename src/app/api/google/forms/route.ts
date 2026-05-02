import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

const requestSchema = z.object({
  constituencyName: z.string().min(1),
  candidates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    party: z.string(),
  })).min(2),
});

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

    const { constituencyName, candidates } = result.data;
    const accessToken = (session as { accessToken?: string })?.accessToken;
    const formTitle = `${constituencyName} — Official Ballot`;

    if (!accessToken) {
      return NextResponse.json({
        mock: true,
        formId: "mock-form-id",
        formUrl: null,
        formTitle,
      });
    }

    const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ info: { title: formTitle, documentTitle: formTitle } }),
    });

    if (!createRes.ok) throw new Error("Failed to create Google Form");

    const formData = await createRes.json();
    const formId = formData.formId;
    const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

    await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            createItem: {
              item: {
                title: "Cast Your Vote",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: candidates.map((c) => ({ value: `${c.name} (${c.party})` })),
                    },
                  },
                },
              },
              location: { index: 0 },
            },
          },
          {
            createItem: {
              item: {
                title: "Voter ID Number",
                questionItem: { question: { required: true, textQuestion: { paragraph: false } } },
              },
              location: { index: 1 },
            },
          },
        ],
      }),
    });

    return NextResponse.json({ formId, formUrl, formTitle });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forms] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
