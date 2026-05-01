export type LatLng = {
  lat: number;
  lng: number;
};

export type LatLngBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type PollingBooth = {
  id: string;
  name: string;
  location: LatLng;
  zoneId?: string;
};

export type Zone = {
  id: string;
  name: string;
  color: "navy" | "red" | "gold";
  boundary?: LatLng[];
};

export type Milestone = {
  id: string;
  date: string;
  title: string;
  description?: string;
  phase: "registration" | "campaign" | "polling" | "results";
  status: "past" | "current" | "future";
};

export type Candidate = {
  id: string;
  name: string;
  party: string;
  photoUrl?: string;
  manifesto?: string;
};

export type VoteRecord = {
  id: string;
  candidateId: string;
  zoneId: string;
  timestamp: string;
};

export type Dispute = {
  id: string;
  zoneId: string;
  reason: string;
  votesAffected: number;
  status: "PENDING" | "RESOLVED";
  resolution?: "ACCEPT" | "REJECT";
};

export interface SimulationState {
  phase: "setup" | "calendar" | "ballot" | "polling" | "results";
  constituency: {
    name: string;
    country: string;
    bounds: LatLngBounds;
    pollingBooths: PollingBooth[];
    zones: Zone[];
    voterRollUrl: string;
  };
  election: {
    calendarId: string;
    milestones: Milestone[];
    ballotFormId: string;
    candidates: Candidate[];
    languages: string[];
  };
  results: {
    votes: VoteRecord[];
    disputes: Dispute[];
    certified: boolean;
    slidesUrl: string;
  };
}
