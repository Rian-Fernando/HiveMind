import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateFusedIdeas } from "@/lib/ai";
import { sha256 } from "@/lib/hash";
import type { FusedIdea } from "@/lib/types";

// Allow up to 60s on Vercel — AI generation can take a while
export const maxDuration = 60;

// If a previous generation attempt crashed, allow a retry after this long
const STALE_GENERATING_MS = 2 * 60 * 1000;

interface IdeaRow {
  author_name: string;
  idea_text: string;
  hide_name: boolean;
  hide_idea: boolean;
}

/**
 * Apply each participant's privacy choices to the AI output BEFORE it is
 * stored (rooms.results is browser-readable):
 *  - name hidden            → credited as "Anonymous"
 *  - idea hidden            → element text replaced with "secret ingredient"
 *  - both hidden            → credit removed entirely (idea still fused in)
 *  - unrecognized label     → dropped, never stored
 */
function maskResults(
  fused: FusedIdea[],
  rows: IdeaRow[],
  labels: string[]
): { ideas: FusedIdea[]; hiddenContributions: number } {
  const byLabel = new Map(
    labels.map((label, i) => [label.toLowerCase(), rows[i]])
  );

  const ideas = fused.map((fi) => {
    const elements: FusedIdea["elements"] = [];
    for (const el of fi.elements ?? []) {
      const row = byLabel.get(String(el.author ?? "").trim().toLowerCase());
      if (!row) continue; // label we never issued — drop it
      if (row.hide_name && row.hide_idea) continue; // fully private
      elements.push({
        author: row.hide_name ? "Anonymous" : row.author_name,
        element: row.hide_idea ? "secret ingredient" : String(el.element ?? ""),
      });
    }
    return {
      title: String(fi.title ?? "Untitled"),
      tagline: String(fi.tagline ?? ""),
      description: String(fi.description ?? ""),
      elements,
    };
  });

  const hiddenContributions = rows.filter(
    (r) => r.hide_name && r.hide_idea
  ).length;

  return { ideas, hiddenContributions };
}

export async function POST(req: NextRequest) {
  let body: { code?: string; hostKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status === "done") {
    return NextResponse.json({ status: "done" });
  }

  const isHost =
    typeof body.hostKey === "string" &&
    sha256(body.hostKey) === room.host_key_hash;

  const { count } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  const submitted = count ?? 0;
  const roomFull = submitted >= room.max_participants;

  // Auto-trigger requires a full room; the host may force early with 2+ ideas
  if (!roomFull && !(isHost && submitted >= 2)) {
    return NextResponse.json(
      {
        error: isHost
          ? "Need at least 2 ideas before generating"
          : "Waiting for everyone to submit",
      },
      { status: 409 }
    );
  }

  // ── Claim the generation (prevents double-runs when several clients
  //    all notice the room is full at the same moment) ──────────────
  const staleCutoff = new Date(Date.now() - STALE_GENERATING_MS).toISOString();
  const claimFrom = room.status === "open" ? "open" : "generating";

  if (room.status === "generating" && room.updated_at > staleCutoff) {
    return NextResponse.json({ status: "generating" });
  }

  const { data: claimed } = await supabase
    .from("rooms")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", room.id)
    .eq("status", claimFrom)
    .select("id");

  if (!claimed || claimed.length === 0) {
    // another request beat us to it
    return NextResponse.json({ status: "generating" });
  }

  // ── Run the AI ────────────────────────────────────────────────────
  const { data: rows } = await supabase
    .from("ideas")
    .select("author_name, idea_text, hide_name, hide_idea")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true });

  const ideaRows = (rows ?? []) as IdeaRow[];

  // The model only ever sees masked labels — never a hidden participant's name
  let anonCounter = 0;
  const labels = ideaRows.map((r) =>
    r.hide_name ? `Anonymous #${++anonCounter}` : r.author_name
  );
  const submissions = ideaRows.map((r, i) => ({
    label: labels[i],
    idea: r.idea_text,
  }));

  try {
    const { provider, ideas: fused } = await generateFusedIdeas(
      room.event_name,
      submissions
    );

    const { ideas, hiddenContributions } = maskResults(fused, ideaRows, labels);

    const results = {
      provider,
      generated_at: new Date().toISOString(),
      ideas,
      hidden_contributions: hiddenContributions,
    };

    await supabase
      .from("rooms")
      .update({ status: "done", results, updated_at: new Date().toISOString() })
      .eq("id", room.id);

    return NextResponse.json({ status: "done" });
  } catch (err) {
    // release the claim so the host can retry
    await supabase
      .from("rooms")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", room.id);

    console.error("Generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 }
    );
  }
}
