export type RoomStatus = "open" | "generating" | "done";

export interface Room {
  id: string;
  code: string;
  event_name: string;
  max_participants: number;
  status: RoomStatus;
  results: GenerationResults | null;
  deadline_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReactionEmoji = "🔥" | "💡" | "😂";
export const REACTION_EMOJIS: ReactionEmoji[] = ["🔥", "💡", "😂"];

/** A masked, display-safe view of one submission (from /api/progress). */
export interface ProgressEntry {
  id: string; // idea row id — used only as a reaction target
  label: string; // author name, or "Anonymous"
  idea: string | null; // null when the participant hid their idea text
  reactions: Record<string, number>; // emoji → count
  mine: string[]; // emojis this device has toggled on
}

/** AI-generated build plan for one fused idea (cached in results). */
export interface DeepDive {
  overview: string;
  mvp_features: string[];
  tech_stack: { layer: string; choice: string; why: string }[];
  roles: { member: string; focus: string }[];
  stretch_goals: string[];
  first_hour: string[];
}

export interface FusedIdea {
  title: string;
  tagline: string;
  description: string;
  /** Privacy-masked before storage — safe to show to everyone. */
  elements: { author: string; element: string }[];
  deep_dive?: DeepDive;
}

export interface GenerationResults {
  provider: "gemini" | "groq";
  generated_at: string;
  ideas: FusedIdea[];
  /** Fully-private participants whose ideas were fused in without credit. */
  hidden_contributions: number;
}

/** Live voting state (from /api/votes). */
export interface VoteState {
  tallies: number[]; // votes per idea index
  total: number;
  myVote: number | null;
}
