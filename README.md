# CIVITAS

> *You Are Not Learning About Elections. You Are Running One.*

**PromptWars by Google — Election Process Education Vertical**

---

## README — OFFICIAL PROJECT DOCUMENTATION

---

## Chosen Vertical

Election Process Education — PromptWars by Google

---

## What CIVITAS Does

Every other submission to this vertical builds the same product: a chatbot that explains the election process step by step. They all share one broken mental model — the citizen is a student who lacks information.

CIVITAS operates from a fundamentally different premise: people do not feel disconnected from elections because they lack information. They feel disconnected because they have never been made responsible for anyone else's democracy.

CIVITAS makes you the Returning Officer of a simulated micro-election for your real neighbourhood — and walks you through running it end to end using actual Google tools, producing real artifacts in your Google account. You do not read about constituency design, ballot rules, or dispute resolution. You do them. And you immediately feel why they matter.

---

## Approach & Logic

### The Behavioral Insight

The moment you are running an election — setting deadlines, designing ballots, placing polling stations, handling disputed votes — every rule, every timeline, every process has an obvious reason for existing. Responsibility creates comprehension that instruction never can.

CIVITAS exploits three well-documented behavioral phenomena:

- **Role-Taking Theory** — occupying the official's role builds empathy for the system's constraints faster than any explainer
- **The Ownership Effect** — you remember rules you created far longer than rules you were told
- **Perspective Inversion** — understanding elections from the inside-out as an official gives richer insight than outside-in as a student

### The Three-Act Simulation

The experience is structured as three sequential, gated acts. A user cannot proceed to Act 2 without completing Act 1. Progress is gated by real task completion, not time.

- **Act 1 — Constituency Setup:** Draw real constituency boundaries on Google Maps, place polling booths with 1.2km coverage validation, generate an official voter roll in Google Sheets, resolve Gemini-flagged accessibility issues
- **Act 2 — Election Calendar & Ballot:** Generate a jurisdiction-specific election timeline into Google Calendar, register candidates, design the ballot paper, translate materials into minority languages via Cloud Translation API, certify the ballot after Gemini review
- **Act 3 — Polling Day & Results:** Watch simulated votes stream in real-time via Firebase, manage a dispute resolution event with Gemini legal advisory, certify the count, generate an official results declaration in Google Slides

### The Gemini AI — Chief Election Commissioner

Gemini 1.5 Pro with Search Grounding acts as the Chief Election Commissioner throughout all three acts. It fetches real, jurisdiction-specific electoral law from official election commission sources, flags accessibility requirements, reviews ballot designs, and provides legal advisories during dispute resolution. Every interaction is personalised to the user's country and constituency.

---

## How the Solution Works

### User Flow

1. **Sign in with Google OAuth** — civic identity layer, progress persists across sessions
2. **Onboarding** — select country, enter neighbourhood name, Gemini fetches real electoral system information
3. **Act 1: Map** — draw constituency boundary, place 3 polling booths, validate 1.2km coverage, auto-generate voter roll in Google Sheets
4. **Act 1: Voter Roll** — review accessibility flags, certify constituency
5. **Act 2: Calendar** — Gemini generates legal timeline, push to Google Calendar
6. **Act 2: Candidates** — register candidates with photos stored in Firebase Storage
7. **Act 2: Ballot** — design ballot paper, translate via Cloud Translation API, Gemini review, certify
8. **Act 3: Polling** — Firebase streams simulated votes in real-time, dispute modal triggers at 60% votes cast
9. **Act 3: Results** — certify count, auto-generate Google Sheets results + Google Slides declaration deck
10. **Declaration** — official results declared, confetti, download results

---

## Google Services — All 11 Integrations

| Google Service | Role in CIVITAS |
| --- | --- |
| **Gemini 1.5 Pro + Search Grounding** | Chief Election Commissioner AI — fetches real jurisdiction-specific electoral law, reviews ballot designs, provides dispute resolution advisories across all three acts |
| **Google Maps Platform** | Act 1 — user draws live constituency boundaries, places polling booths, validates 1.2km walking distance constraint via haversine calculation |
| **Google Sheets API** | Act 1: generates 200-voter official voter roll shared with user. Act 3: writes certified results table shared with user |
| **Google Calendar API** | Act 2 — generates legal election timeline as real Calendar events in the user's own Google Calendar with correct jurisdiction-specific durations |
| **Google Forms API** | Act 2 — creates official ballot paper as a real Google Form with candidates in user-chosen order |
| **Cloud Translation API** | Act 2 — translates all ballot materials into minority language when constituency data indicates language obligations |
| **Looker Studio Embed** | Act 3 — live results dashboard embedded in the polling page (falls back to recharts if embed URL not configured) |
| **Firebase Firestore** | Act 3 — real-time vote streaming simulation. Dispute events written to Firestore and trigger the dispute modal via onSnapshot listener |
| **Google Slides API** | Act 3 — auto-generates 4-slide official results declaration deck with navy/cream Paper Authority styling, shared with user |
| **YouTube Data API v3** | Contextual explainer videos surface at key friction points throughout the simulation |
| **Google OAuth 2.0 + NextAuth** | Mandatory login. User's Google identity links all created documents — Sheets, Calendar events, Slides — to their real account |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 14 (App Router) + TypeScript |
| **UI** | shadcn/ui + Tailwind CSS (Paper Authority custom design system) |
| **State** | Zustand with localStorage persistence |
| **Auth** | NextAuth.js v4 with Google OAuth 2.0 |
| **AI** | Google Gemini 1.5 Pro API with Search Grounding |
| **Maps** | Google Maps JavaScript API + Geocoding API |
| **Realtime** | Firebase Firestore |
| **Storage** | Firebase Storage |
| **Animations** | Framer Motion |
| **Testing** | Jest + React Testing Library |
| **Deployment** | Google Cloud Run |

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- Google Cloud project with billing enabled
- Firebase project
- All required API keys (see Environment Variables below)

### Installation

```bash
git clone https://github.com/[your-username]/civitas.git
cd civitas
npm install
cp .env.example .env.local
# Fill in all environment variables in .env.local
npm run dev
```

### Required Google APIs — Enable in Google Cloud Console

- Gemini API (via Google AI Studio — aistudio.google.com)
- Google Maps JavaScript API
- Geocoding API
- Google Sheets API
- Google Calendar API
- Google Slides API
- Google Forms API
- Cloud Translation API
- YouTube Data API v3
- Google Drive API (for sharing documents)

### Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=         # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=          # from aistudio.google.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_CALENDAR_API_KEY=
GOOGLE_SHEETS_API_KEY=
GOOGLE_SLIDES_API_KEY=
GOOGLE_FORMS_API_KEY=
GOOGLE_TRANSLATION_API_KEY=
YOUTUBE_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
LOOKER_STUDIO_EMBED_URL=  # optional, recharts fallback if empty
```

---

## Assumptions Made

- The voter roll uses 200 simulated voters per constituency — real electoral rolls are not used for privacy reasons
- Vote streaming uses Firebase simulation engine — real votes are not collected
- Google Forms creates a real ballot form but voting is simulated via Firebase, not through form submissions
- Looker Studio dashboard requires a pre-configured template URL — recharts fallback is provided
- Country-specific electoral law is fetched by Gemini with Search Grounding — accuracy depends on Gemini's search results and should be independently verified for legal use
- The simulation runs 200 total votes with configurable interval — `TOTAL_VOTERS` constant in `polling/page.tsx` can be adjusted
- OAuth token refresh is handled automatically — users may need to re-sign-in after extended sessions

---

## Accessibility

- WCAG AA colour contrast compliance across all Paper Authority palette combinations
- Full keyboard navigation — all interactive elements reachable via Tab
- Skip navigation link at top of every page
- ARIA labels on all icon-only buttons
- `role="dialog"` `aria-modal="true"` on dispute resolution modal with focus trap
- `aria-live="polite"` on vote counter for screen reader announcements
- Semantic HTML throughout — `nav`, `main`, `aside`, `section` elements used correctly
- Google Maps includes `aria-label` and keyboard interaction instructions

---

## Design System — Paper Authority

CIVITAS uses a custom design system called **Paper Authority** — inspired by the visual language of official democratic infrastructure: ballot papers, rubber stamps, constituency maps, government seals, and official form fields.

The guiding question for every design decision: *"Does this feel like the Election Commission hired a world-class typographer?"* Every screen must feel like an official document, not a SaaS product.

| Token | Value |
| --- | --- |
| `--paper-cream` | `#F5F0E8` — Primary background |
| `--ink-navy` | `#1A1A2E` — Primary text and structure |
| `--official-red` | `#C0392B` — Actions, alerts, stamp motifs |
| `--gov-gold` | `#D4A017` — Certified states, approvals |
| Heading font | Playfair Display Bold |
| Body font | IBM Plex Mono |
| Border radius | 0px everywhere (except avatar images) |
| Shadows | None — border contrast used instead |

---

## Testing

```bash
npm test              # run all tests
npm run test:coverage # run with coverage report
```

Test coverage includes:

- All Paper Authority custom UI components (`StampBadge`, `OfficialCard`, `FormField`, `BallotCounter`)
- Zustand simulation store — phase transitions and state updates
- API route handlers — authentication, input validation, error responses
- Constituency validation logic — booth count, coverage, boundary requirements

---

*CIVITAS — Built for PromptWars by Google*
