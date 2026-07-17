import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  let body: {
    code?: string;
    name?: string;
    idea?: string;
    hideName?: boolean;
    hideIdea?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const hideName = Boolean(body.hideName);
  const hideIdea = Boolean(body.hideIdea);
  const name = hideName ? "Anonymous" : (body.name ?? "").trim().slice(0, 40);
  const idea = (body.idea ?? "").trim().slice(0, 600);

  if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });
  if (!hideName && !name) {
    return NextResponse.json(
      { error: "Enter your name — or switch on “Hide my name”" },
      { status: 400 }
    );
  }
  if (idea.length < 10) {
    return NextResponse.json(
      { error: "Give your idea at least a sentence (10+ characters)" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, status, max_participants")
    .eq("code", code)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "open") {
    return NextResponse.json(
      { error: "This room has already generated its ideas" },
      { status: 409 }
    );
  }

  const { count } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= room.max_participants) {
    return NextResponse.json({ error: "This room is already full" }, { status: 409 });
  }

  const { error: insertErr } = await supabase.from("ideas").insert({
    room_id: room.id,
    author_name: name,
    idea_text: idea,
    hide_name: hideName,
    hide_idea: hideIdea,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: `Someone already submitted as "${name}" — pick a different name` },
        { status: 409 }
      );
    }
    console.error("Idea insert failed:", insertErr);
    return NextResponse.json({ error: "Could not save your idea" }, { status: 500 });
  }

  // Bump the room so realtime subscribers (who can't read the private
  // ideas table) get a "something changed" signal and refetch progress.
  await supabase
    .from("rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", room.id)
    .eq("status", "open");

  const { count: newCount } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  return NextResponse.json({
    submitted: newCount ?? 0,
    max: room.max_participants,
    full: (newCount ?? 0) >= room.max_participants,
  });
}
