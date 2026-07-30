import type { DeepDive, FusedIdea } from "./types";

/**
 * Sample session used by /demo. Deliberately covers all four privacy
 * combinations so the walkthrough can explain each one. Nothing here
 * touches the database or the AI providers.
 */

export const DEMO_EVENT = "HackAdelphi 2026 — Team Rocket";
export const DEMO_CODE = "K7XM2P";

export interface DemoPitch {
  label: string;
  idea: string | null;
  hideName: boolean;
  hideIdea: boolean;
  note: string;
  reactions: Record<string, number>;
}

export const DEMO_PITCHES: DemoPitch[] = [
  {
    label: "Rian",
    idea: "An AI voice agent that coaches students through mock interviews and gives live feedback on tone and filler words.",
    hideName: false,
    hideIdea: false,
    note: "Fully open — name and pitch both visible.",
    reactions: { "🔥": 2, "💡": 1 },
  },
  {
    label: "Maya",
    idea: null,
    hideName: false,
    hideIdea: true,
    note: "Name shown, pitch hidden. Maya wants credit without revealing her idea yet.",
    reactions: {},
  },
  {
    label: "Anonymous",
    idea: "A gamified recycling bin that scans what you throw away and awards campus meal-plan points.",
    hideName: true,
    hideIdea: false,
    note: "Pitch shown, name hidden — the idea gets discussed on its own merit.",
    reactions: { "💡": 2 },
  },
  {
    label: "Anonymous",
    idea: null,
    hideName: true,
    hideIdea: true,
    note: "Fully incognito. This pitch still shapes every result, but is never credited anywhere.",
    reactions: {},
  },
];

export const DEMO_RESULTS: FusedIdea[] = [
  {
    title: "GreenRoom",
    tagline: "Practice your pitch, power the campus.",
    description:
      "A mock-interview coach where every completed practice session banks 'green credits' that convert into real campus meal-plan points. The voice agent scores tone and filler words, while a leaderboard turns interview prep into a dorm-wide competition.",
    elements: [
      { author: "Rian", element: "live tone and filler-word feedback" },
      { author: "Maya", element: "secret ingredient" },
      { author: "Anonymous", element: "campus meal-point rewards" },
    ],
  },
  {
    title: "SortSpeak",
    tagline: "The bin that interviews you back.",
    description:
      "A kiosk beside campus recycling bins that asks a quick spoken question about what you're throwing out, verifies the sort with a camera, and rewards correct answers with meal points. Voice analysis keeps it fast and hands-free.",
    elements: [
      { author: "Rian", element: "conversational voice agent" },
      { author: "Maya", element: "secret ingredient" },
      { author: "Anonymous", element: "scan-and-reward loop" },
    ],
  },
  {
    title: "Second Draft",
    tagline: "Rehearse anything, get points for showing up.",
    description:
      "A habit engine for anything you have to say out loud — interviews, presentations, difficult conversations. It grades delivery over time, tracks streaks, and pays out in campus currency so practising has an immediate reward.",
    elements: [
      { author: "Rian", element: "delivery scoring over time" },
      { author: "Maya", element: "secret ingredient" },
      { author: "Anonymous", element: "streak-based point economy" },
    ],
  },
  {
    title: "Ledger of Small Wins",
    tagline: "Every improvement, banked and visible.",
    description:
      "A shared campus feed where small verified improvements — a better interview run, a correct recycling sort, a completed practice streak — post as tiny wins with point values. The social proof does the motivating, not the reminders.",
    elements: [
      { author: "Rian", element: "measurable improvement signal" },
      { author: "Maya", element: "secret ingredient" },
      { author: "Anonymous", element: "verified-action rewards" },
    ],
  },
];

export const DEMO_VOTES = [1, 4, 2, 1]; // tallies per idea — GreenRoom's rival wins

export const DEMO_DEEP_DIVE: DeepDive = {
  overview:
    "SortSpeak is demo-friendly because the whole loop fits on one screen: speak, verify, reward. Build the voice turn and the reward ledger first — the camera check can be faked with a confidence slider until the last hours.",
  mvp_features: [
    "Push-to-talk question prompt with speech-to-text transcription",
    "Simple sort verification: camera snapshot plus a confidence score",
    "Points ledger with a running balance per student",
    "Kiosk screen showing the last five sorts and points awarded",
  ],
  tech_stack: [
    {
      layer: "Frontend",
      choice: "Next.js + Web Speech API",
      why: "Speech recognition in the browser with zero install on a kiosk tablet",
    },
    {
      layer: "Vision",
      choice: "MediaPipe / TensorFlow.js in-browser classifier",
      why: "Runs locally, no image ever leaves the device, no API cost",
    },
    {
      layer: "Backend",
      choice: "Supabase (Postgres + Realtime)",
      why: "Ledger writes and a live leaderboard without writing a server",
    },
  ],
  roles: [
    { member: "Rian", focus: "Voice turn: capture, transcription, scoring UI" },
    { member: "Maya", focus: "Vision check and kiosk screen layout" },
    {
      member: "Anonymous",
      focus: "Points ledger, Supabase schema, live leaderboard",
    },
  ],
  stretch_goals: [
    "Dorm-versus-dorm weekly leaderboard",
    "Meal-plan API integration instead of a simulated balance",
  ],
  first_hour: [
    "Agree the demo script: one spoken sort, end to end, on one device",
    "Scaffold the Next.js app and get the microphone permission flow working",
    "Create the Supabase tables for students, sorts, and points",
    "Hard-code one item class so the reward path can be tested immediately",
  ],
};
