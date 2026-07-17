export type RoomStatus = "open" | "generating" | "done";

export interface Room {
  id: string;
  code: string;
  event_name: string;
  max_participants: number;
  status: RoomStatus;
  results: GenerationResults | null;
  created_at: string;
  updated_at: string;
}

/** A masked, display-safe view of one submission (from /api/progress). */
export interface ProgressEntry {
  label: string; // author name, or "Anonymous"
  idea: string | null; // null when the participant hid their idea text
}

export interface FusedIdea {
  title: string;
  tagline: string;
  description: string;
  /** Privacy-masked before storage — safe to show to everyone. */
  elements: { author: string; element: string }[];
}

export interface GenerationResults {
  provider: "gemini" | "groq";
  generated_at: string;
  ideas: FusedIdea[];
  /** Fully-private participants whose ideas were fused in without credit. */
  hidden_contributions: number;
}
