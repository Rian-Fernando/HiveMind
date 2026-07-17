import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateDeepDive } from "@/lib/ai";
import type { GenerationResults } from "@/lib/types";

// Allow up to 60s on Vercel — AI generation can take a while
export const maxDuration = 60;

/**
 * Generate (and cache) a build plan for one fused idea. The first click
 * pays the AI call; the plan is stored inside rooms.results so everyone
 * in the room sees it instantly afterwards.
 */
export async function POST(req: NextRequest) {
  let body: { code?: string; ideaIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const ideaIndex = Number(body.ideaIndex);
  if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, event_name, status, results")
    .eq("code", code)
    .single();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "done" || !room.results) {
    return NextResponse.json({ error: "No results yet" }, { status: 409 });
  }

  const results = room.results as GenerationResults;
  if (!Number.isInteger(ideaIndex) || ideaIndex < 0 || ideaIndex >= results.ideas.length) {
    return NextResponse.json({ error: "Invalid idea" }, { status: 400 });
  }

  // Already generated (by anyone in the room) → serve the cached plan
  if (results.ideas[ideaIndex].deep_dive) {
    return NextResponse.json({ deepDive: results.ideas[ideaIndex].deep_dive });
  }

  // Team labels, privacy-masked exactly like the credits: use whatever
  // survived masking in the stored elements, deduped. Fully-private
  // participants aren't listed there — represent them as "a teammate".
  const labelSet = new Set<string>();
  for (const el of results.ideas[ideaIndex].elements) labelSet.add(el.author);
  for (let i = 0; i < results.hidden_contributions; i++) {
    labelSet.add(i === 0 ? "A teammate (private)" : `A teammate (private ${i + 1})`);
  }
  const teamLabels = [...labelSet];

  try {
    const { deepDive } = await generateDeepDive(
      room.event_name,
      results.ideas[ideaIndex],
      teamLabels.length > 0 ? teamLabels : ["The team"]
    );

    // Cache it. Rare double-generation (two simultaneous first clicks) is
    // harmless — last write wins with an equivalent plan.
    results.ideas[ideaIndex].deep_dive = deepDive;
    await supabase
      .from("rooms")
      .update({ results, updated_at: new Date().toISOString() })
      .eq("id", room.id);

    return NextResponse.json({ deepDive });
  } catch (err) {
    console.error("Deep dive failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deep dive failed" },
      { status: 502 }
    );
  }
}
