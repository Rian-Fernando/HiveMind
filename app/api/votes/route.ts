import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { VoteState } from "@/lib/types";

async function loadRoom(code: string) {
  const supabase = getSupabaseAdmin();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, results")
    .eq("code", code)
    .single();
  return { supabase, room };
}

function buildState(
  rows: { idea_index: number; voter_key: string }[],
  ideaCount: number,
  device: string
): VoteState {
  const tallies = Array.from({ length: ideaCount }, () => 0);
  let myVote: number | null = null;
  for (const row of rows) {
    if (row.idea_index < ideaCount) tallies[row.idea_index]++;
    if (device && row.voter_key === device) myVote = row.idea_index;
  }
  return { tallies, total: rows.length, myVote };
}

/** Live vote tallies. Pass ?device=<key> to learn this device's vote. */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  const device = (req.nextUrl.searchParams.get("device") ?? "").slice(0, 64);
  if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });

  const { supabase, room } = await loadRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const ideaCount = room.results?.ideas?.length ?? 0;
  const { data: rows } = await supabase
    .from("votes")
    .select("idea_index, voter_key")
    .eq("room_id", room.id);

  return NextResponse.json(buildState(rows ?? [], ideaCount, device));
}

/** Cast (or change) this device's vote for a fused idea. */
export async function POST(req: NextRequest) {
  let body: { code?: string; ideaIndex?: number; device?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const device = (body.device ?? "").trim().slice(0, 64);
  const ideaIndex = Number(body.ideaIndex);

  if (!code || !device) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { supabase, room } = await loadRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "done") {
    return NextResponse.json({ error: "Voting opens once ideas are generated" }, { status: 409 });
  }

  const ideaCount = room.results?.ideas?.length ?? 0;
  if (!Number.isInteger(ideaIndex) || ideaIndex < 0 || ideaIndex >= ideaCount) {
    return NextResponse.json({ error: "Invalid idea" }, { status: 400 });
  }

  const { error: upsertErr } = await supabase
    .from("votes")
    .upsert(
      { room_id: room.id, idea_index: ideaIndex, voter_key: device },
      { onConflict: "room_id,voter_key" }
    );

  if (upsertErr) {
    console.error("Vote upsert failed:", upsertErr);
    return NextResponse.json({ error: "Could not save vote" }, { status: 500 });
  }

  // Signal realtime subscribers to refetch tallies
  await supabase
    .from("rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", room.id);

  const { data: rows } = await supabase
    .from("votes")
    .select("idea_index, voter_key")
    .eq("room_id", room.id);

  return NextResponse.json(buildState(rows ?? [], ideaCount, device));
}
