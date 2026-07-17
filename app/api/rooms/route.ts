import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sha256 } from "@/lib/hash";

// No ambiguous characters (0/O, 1/I/L) so codes are easy to read aloud
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  let body: { eventName?: string; maxParticipants?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName = (body.eventName ?? "").trim().slice(0, 80);
  const maxParticipants = Number(body.maxParticipants);

  if (!eventName) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }
  if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 50) {
    return NextResponse.json(
      { error: "Group size must be a whole number between 2 and 50" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const hostKey = randomUUID();

  // Retry a few times in the (unlikely) event of a code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await supabase.from("rooms").insert({
      code,
      event_name: eventName,
      max_participants: maxParticipants,
      host_key_hash: sha256(hostKey),
    });

    if (!error) {
      return NextResponse.json({ code, hostKey });
    }
    if (error.code !== "23505") {
      // anything other than a unique-violation is a real failure
      console.error("Room insert failed:", error);
      return NextResponse.json({ error: "Could not create room" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not create room" }, { status: 500 });
}
