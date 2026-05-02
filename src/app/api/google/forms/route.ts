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

type RequestData = z.infer<typeof requestSchema>;

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

    const { constituencyName, candidates } = result.data;

    const accessToken = (session as { accessToken?: string })?.accessToken;
    const formTitle = `${constituencyName} — Official Ballot`;

    if (!accessToken) {
      // Mock response for unauthenticated Sheets scope
      return NextResponse.json({
        mock: true,
        formId: "mock-form-id",
        formUrl: null,
        formTitle,
        message:
          "No Google access token. Re-authenticate with Forms scope to create a real ballot form.",
      });
    }

    // 1. Create the Form
    const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        info: {
          title: formTitle,
          documentTitle: formTitle,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json(
        { error: "Failed to create Google Form", details: err },
        { status: 500 }
      );
    }

    const formData = await createRes.json();
    const formId: string = formData.formId;
    const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

    // 2. Add voting question with candidates as choices
    const batchRes = await fetch(
      `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              createItem: {
                item: {
                  title: "Cast Your Vote",
                  description:
                    `Select ONE candidate. This is your official ballot for the ${constituencyName} constituency election.`,
                  questionItem: {
                    question: {
                      required: true,
                      choiceQuestion: {
                        type: "RADIO",
                        options: candidates.map((c) => ({
                          value: `${c.name} (${c.party})`,
                        })),
                        shuffle: false,
                      },
                    },
                  },
                },
                location: { index: 0 },
              },
            },
            // Voter ID question
            {
              createItem: {
                item: {
                  title: "Voter ID Number",
                  description: "Enter your Voter ID as it appears on the official roll.",
                  questionItem: {
                    question: {
                      required: true,
                      textQuestion: { paragraph: false },
                    },
                  },
                },
                location: { index: 1 },
              },
            },
          ],
        }),
      }
    );

    if (!batchRes.ok) {
      const err = await batchRes.json();
      return NextResponse.json({ formId, formUrl, partialError: err });
    }

    return NextResponse.json({ formId, formUrl, formTitle });
  } catch (err) {
    console.error("[forms] Unhandled error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
