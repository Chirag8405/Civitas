"use client";

import * as React from "react";

import {
  BallotCounter,
  ElectionTimeline,
  FormField,
  GeminiAdvisor,
  MapConstituency,
  OfficialCard,
  OfficialInput,
  OfficialSelect,
  OfficialTextarea,
  PageHeader,
  Sidebar,
  StampBadge,
} from "@/components/ui";
import type { GeminiMessage, TimelineMilestone } from "@/components/ui";

const milestones: TimelineMilestone[] = [
  {
    date: "Apr 02",
    title: "Nominations Open",
    description: "Open candidate registration window.",
    phase: "registration",
    status: "past",
  },
  {
    date: "Apr 10",
    title: "Campaign Period",
    description: "Official campaigning begins.",
    phase: "campaign",
    status: "current",
  },
  {
    date: "Apr 22",
    title: "Polling Day",
    description: "Polling stations open 07:00-19:00.",
    phase: "polling",
    status: "future",
  },
  {
    date: "Apr 23",
    title: "Results Declaration",
    description: "Final certification and public declaration.",
    phase: "results",
    status: "future",
  },
];

const messages: GeminiMessage[] = [
  {
    id: "1",
    ref: "ADVISORY REF: CE-1042",
    text: "Confirm accessibility at all polling locations before certification.",
  },
  {
    id: "2",
    ref: "ADVISORY REF: CE-1051",
    text: "Minority language ballot translations are required for Zone 3.",
  },
];

export default function ComponentsPreviewPage() {
  const handleSend = React.useCallback(async (message: string) => {
    console.info("Gemini advisory sent", message);
  }, []);

  return (
    <div className="min-h-screen bg-paperCream text-inkNavy">
      <Sidebar
        active="overview"
        lockedActs={["act2", "act3"]}
        userName="A. Returning Officer"
      />
      <div className="ml-60 space-y-10 p-10">
        <PageHeader
          title="Components Preview"
          subtitle="Paper Authority component library"
          badge={{ variant: "CERTIFIED" }}
        />

        <section className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <StampBadge variant="CERTIFIED" />
            <StampBadge variant="PENDING" />
            <StampBadge variant="DISPUTED" />
            <StampBadge variant="REJECTED" />
            <StampBadge variant="CLASSIFIED" />
          </div>

          <OfficialCard title="OFFICIAL CARD" status="active">
            <p className="text-sm font-mono text-midGray">
              OfficialCard content area with a Paper Authority border.
            </p>
          </OfficialCard>

          <OfficialCard title="FORM FIELD">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Constituency Name" htmlFor="constituency">
                <OfficialInput id="constituency" placeholder="e.g. Bandra West" />
              </FormField>
              <FormField label="Polling Zone" htmlFor="zone">
                <OfficialSelect id="zone">
                  <option>Zone 1</option>
                  <option>Zone 2</option>
                  <option>Zone 3</option>
                </OfficialSelect>
              </FormField>
              <FormField label="Notes" htmlFor="notes" error="Required field">
                <OfficialTextarea id="notes" placeholder="Add notes" />
              </FormField>
            </div>
          </OfficialCard>

          <OfficialCard title="ELECTION TIMELINE">
            <ElectionTimeline milestones={milestones} />
          </OfficialCard>

          <OfficialCard title="BALLOT COUNTER">
            <BallotCounter current={147} total={200} />
          </OfficialCard>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_400px]">
          <OfficialCard title="MAP CONSTITUENCY">
            <MapConstituency
              booths={[
                {
                  id: "booth-1",
                  name: "Booth 1",
                  location: { lat: 51.505, lng: -0.09 },
                },
                {
                  id: "booth-2",
                  name: "Booth 2",
                  location: { lat: 51.51, lng: -0.1 },
                },
              ]}
              zones={[]}
              onBoundaryChange={() => undefined}
              onBoothPlace={() => undefined}
            />
          </OfficialCard>

          <GeminiAdvisor onSend={handleSend} messages={messages} loading={false} />
        </section>
      </div>
    </div>
  );
}
