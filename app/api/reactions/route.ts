import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { REACTION_EMOJIS } from "@/lib/types";

/** Toggle an emoji reaction on a visible pitch (submission phase only). */
export async function POST(req: NextRequest) {
  let body: { code?: string; ideaId?: string; emoji?: string; device?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const ideaId = (body.ideaId ?? "").trim();
  const emoji = body.emoji ?? "";
  const device = (body.device ?? "").trim().slice(0, 64);

  if (!code || !ideaId || !device) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!REACTION_EMOJIS.includes(emoji as (typeof REACTION_EMOJIS)[number])) {
    return NextResponse.json({ error: "Unknown emoji" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, status")
    .eq("code", code)
    .single();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "open") {
    return NextResponse.json({ error: "Reactions are closed" }, { status: 409 });
  }

  // Verify the pitch belongs to this room and its text is visible
  const { data: idea } = await supabase
    .from("ideas")
    .select("id, hide_idea")
    .eq("id", ideaId)
    .eq("room_id", room.id)
    .single();

  if (!idea) return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
  if (idea.hide_idea) {
    return NextResponse.json({ error: "This pitch is private" }, { status: 409 });
  }

  // Toggle: delete if present, insert otherwise
  const { data: deleted } = await supabase
    .from("reactions")
    .delete()
    .eq("idea_id", ideaId)
    .eq("reactor_key", device)
    .eq("emoji", emoji)
    .select("id");

  if (!deleted || deleted.length === 0) {
    const { error: insertErr } = await supabase.from("reactions").insert({
      room_id: room.id,
      idea_id: ideaId,
      emoji,
      reactor_key: device,
    });
    if (insertErr && insertErr.code !== "23505") {
      console.error("Reaction insert failed:", insertErr);
      return NextResponse.json({ error: "Could not react" }, { status: 500 });
    }
  }

  // Signal realtime subscribers to refetch progress
  await supabase
    .from("rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", room.id)
    .eq("status", "open");

  return NextResponse.json({ ok: true });
}
