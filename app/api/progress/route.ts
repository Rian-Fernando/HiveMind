import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProgressEntry } from "@/lib/types";

/**
 * The ideas table is not readable by the browser (participants can mark
 * their name and/or idea text private), so the room page fetches this
 * masked view instead.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
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

  const { data: ideas } = await supabase
    .from("ideas")
    .select("author_name, idea_text, hide_name, hide_idea")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true });

  const participants: ProgressEntry[] = (ideas ?? []).map((row) => ({
    label: row.hide_name ? "Anonymous" : row.author_name,
    idea: row.hide_idea ? null : row.idea_text,
  }));

  return NextResponse.json({ participants });
}
