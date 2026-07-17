"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark } from "@/components/LogoMark";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { ProgressEntry, Room, VoteState } from "@/lib/types";

/**
 * Presenter view — made for a projector at an event kickoff:
 * giant QR + live counter while pitching, then results with live votes.
 */
export default function PresentPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ProgressEntry[]>([]);
  const [votes, setVotes] = useState<VoteState | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const prevStatus = useRef<Room["status"] | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: r } = await supabase
      .from("rooms")
      .select(
        "id, code, event_name, max_participants, status, results, deadline_at, created_at, updated_at"
      )
      .eq("code", code)
      .single();
    if (!r) return;

    if (prevStatus.current && prevStatus.current !== "done" && r.status === "done") {
      const brand = ["#F6B93B", "#F4EFE7", "#C8901A"];
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.3 }, colors: brand });
    }
    prevStatus.current = r.status;
    setRoom(r as Room);

    try {
      const res = await fetch(`/api/progress?code=${code}`);
      if (res.ok) setParticipants((await res.json()).participants ?? []);
      if (r.status === "done") {
        const vres = await fetch(`/api/votes?code=${code}`);
        if (vres.ok) setVotes(await vres.json());
      }
    } catch {
      // transient — polling retries
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    setShareUrl(`${window.location.origin}/room/${code}`);
    load();
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [code, load]);

  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`present-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, load]);

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="animate-pulse-soft text-2xl text-fog">Loading…</p>
      </main>
    );
  }

  const submitted = participants.length;
  const max = room.max_participants;
  const joinHost = shareUrl.replace(/^https?:\/\//, "");
  const deadlineMs = room.deadline_at ? new Date(room.deadline_at).getTime() : null;
  const remainingMs = deadlineMs != null ? Math.max(0, deadlineMs - now) : null;

  // ── DONE: results big-screen ─────────────────────────────────────
  if (room.status === "done" && room.results) {
    const tallies = votes?.tallies ?? [];
    const maxVotes = tallies.length ? Math.max(...tallies) : 0;
    return (
      <main className="min-h-screen px-10 py-10">
        <PresentHeader eventName={room.event_name} code={code} />
        <h1 className="mt-6 text-center text-5xl font-bold tracking-tight">
          {room.results.ideas.length} ideas,{" "}
          <em className="font-accent italic text-honey">fused from {submitted} minds</em>
        </h1>
        <p className="mt-3 text-center text-xl text-fog">
          Vote on your phones — tallies update live.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {room.results.ideas.map((fi, i) => {
            const count = tallies[i] ?? 0;
            const leading =
              maxVotes > 0 &&
              count === maxVotes &&
              tallies.filter((t) => t === maxVotes).length === 1;
            return (
              <article
                key={i}
                style={{ animationDelay: `${i * 130}ms` }}
                className={`animate-rise-in rounded-2xl border-2 bg-panel p-8 ${
                  leading ? "border-honey" : "border-line"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-3xl font-bold">{fi.title}</h2>
                  <span
                    className={`ml-4 shrink-0 rounded-full px-4 py-1.5 text-lg font-bold ${
                      leading ? "bg-honey text-ink" : "bg-raise text-fog"
                    }`}
                  >
                    {leading && "👑 "}
                    {count}
                  </span>
                </div>
                <p className="mt-2 font-accent text-2xl italic text-honey">{fi.tagline}</p>
                <p className="mt-4 text-lg leading-relaxed text-fog">{fi.description}</p>
              </article>
            );
          })}
        </div>
        {room.results.hidden_contributions > 0 && (
          <p className="mt-8 text-center text-lg italic text-fog">
            …plus {room.results.hidden_contributions} secret{" "}
            {room.results.hidden_contributions === 1 ? "contribution" : "contributions"} 🐝
          </p>
        )}
      </main>
    );
  }

  // ── GENERATING ───────────────────────────────────────────────────
  if (room.status === "generating") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-10">
        <div className="flex h-28 w-28 animate-pulse-soft items-center justify-center rounded-3xl bg-honey text-6xl">
          🐝
        </div>
        <h1 className="mt-10 text-6xl font-bold">Fusing {submitted} ideas…</h1>
        <p className="mt-4 text-2xl text-fog">One element from every pitch. Any second now.</p>
      </main>
    );
  }

  // ── OPEN: giant QR + live counter ────────────────────────────────
  return (
    <main className="min-h-screen px-10 py-10">
      <PresentHeader eventName={room.event_name} code={code} />
      <div className="mt-10 grid items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col items-center">
          <div className="rounded-3xl bg-snow p-8">
            {shareUrl && <QRCodeSVG value={shareUrl} size={380} marginSize={0} />}
          </div>
          <p className="mt-6 text-2xl text-fog">
            or visit <span className="font-bold text-snow">{joinHost}</span>
          </p>
        </div>
        <div>
          <h1 className="text-6xl font-bold leading-tight tracking-tight">
            Scan.
            <br />
            Pitch your idea.
            <br />
            <em className="font-accent italic text-honey">Openly or anonymously.</em>
          </h1>
          <p className="mt-8 text-8xl font-bold tabular-nums">
            <span className="text-honey">{submitted}</span>
            <span className="text-fog/50"> / {max}</span>
          </p>
          <p className="mt-2 text-2xl text-fog">pitches in</p>
          {remainingMs != null && remainingMs > 0 && (
            <p className="mt-6 text-3xl text-fog">
              ⏳{" "}
              <span
                className={`font-bold tabular-nums ${
                  remainingMs < 60_000 ? "text-red-400" : "text-honey"
                }`}
              >
                {formatCountdown(remainingMs)}
              </span>{" "}
              until fusion
            </p>
          )}
          {participants.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className={`rounded-full border border-line bg-panel px-5 py-2 text-lg ${
                    p.label === "Anonymous" ? "italic text-fog" : "text-snow"
                  }`}
                >
                  ✓ {p.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PresentHeader({ eventName, code }: { eventName: string; code: string }) {
  return (
    <header className="flex items-center justify-between">
      <span className="flex items-center gap-3 text-2xl font-bold tracking-tight">
        <LogoMark size={36} />
        <span>
          Hive<span className="text-honey">Mind</span>
        </span>
      </span>
      <span className="text-2xl text-fog">{eventName}</span>
      <span className="rounded-full border-2 border-honey px-5 py-2 text-2xl font-bold tracking-[0.3em] text-honey">
        {code}
      </span>
    </header>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
