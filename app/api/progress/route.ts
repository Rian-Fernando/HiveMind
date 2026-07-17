import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProgressEntry } from "@/lib/types";

/**
 * The ideas table is not readable by the browser (participants can mark
 * their name and/or idea text private), so the room page fetches this
 * masked view instead. Includes per-pitch reaction tallies; pass
 * ?device=<key> to learn which reactions this device has toggled on.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  const device = (req.nextUrl.searchParams.get("device") ?? "").slice(0, 64);
  if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const [{ data: ideas }, { data: reactions }] = await Promise.all([
    supabase
      .from("ideas")
      .select("id, author_name, idea_text, hide_name, hide_idea")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("reactions")
      .select("idea_id, emoji, reactor_key")
      .eq("room_id", room.id),
  ]);

  const participants: ProgressEntry[] = (ideas ?? []).map((row) => {
    const rows = (reactions ?? []).filter((r) => r.idea_id === row.id);
    const tally: Record<string, number> = {};
    for (const r of rows) tally[r.emoji] = (tally[r.emoji] ?? 0) + 1;
    return {
      id: row.id,
      label: row.hide_name ? "Anonymous" : row.author_name,
      idea: row.hide_idea ? null : row.idea_text,
      reactions: tally,
      mine: device
        ? rows.filter((r) => r.reactor_key === device).map((r) => r.emoji)
        : [],
    };
  });

  return NextResponse.json({ participants });
}
