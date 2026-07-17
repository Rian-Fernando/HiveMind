"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark } from "@/components/LogoMark";
import { ResultsView } from "@/components/ResultsView";
import { getDeviceKey, recordRoomVisit } from "@/lib/device";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { REACTION_EMOJIS, type ProgressEntry, type Room } from "@/lib/types";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [participants, setParticipants] = useState<ProgressEntry[]>([]);
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [submittedAs, setSubmittedAs] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // submission form
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [hideName, setHideName] = useState(false);
  const [hideIdea, setHideIdea] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // host / generation
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const autoTriggered = useRef(false);
  const prevStatus = useRef<Room["status"] | null>(null);
  const historyRecorded = useRef(false);

  // ── data loading ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: r, error } = await supabase
      .from("rooms")
      .select(
        "id, code, event_name, max_participants, status, results, deadline_at, created_at, updated_at"
      )
      .eq("code", code)
      .single();

    if (error || !r) {
      setNotFound(true);
      return;
    }

    // fire confetti only on the live transition into "done"
    if (prevStatus.current && prevStatus.current !== "done" && r.status === "done") {
      setCelebrate(true);
    }
    prevStatus.current = r.status;
    setRoom(r as Room);

    if (!historyRecorded.current) {
      historyRecorded.current = true;
      recordRoomVisit(code, r.event_name);
    }

    // idea rows are private — this endpoint returns a masked view
    try {
      const device = localStorage.getItem("hm-device") ?? "";
      const res = await fetch(`/api/progress?code=${code}&device=${device}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants ?? []);
      }
    } catch {
      // transient network issue — polling will retry
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    setDeviceKey(getDeviceKey());
    setHostKey(localStorage.getItem(`hm-host-${code}`));
    setSubmittedAs(localStorage.getItem(`hm-submitted-${code}`));
    setShareUrl(`${window.location.origin}/room/${code}`);
    load();
  }, [code, load]);

  // realtime (room row bumps on submissions, reactions, votes, deep dives)
  // + polling fallback — kept alive in "done" so tallies update live
  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        () => load()
      )
      .subscribe();

    const poll = setInterval(load, 5000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [room?.id, load]);

  // 1s ticker for the countdown
  useEffect(() => {
    if (room?.status !== "open" || !room.deadline_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [room?.status, room?.deadline_at]);

  // ── trigger generation ───────────────────────────────────────────
  const triggerGenerate = useCallback(
    async (asHost: boolean) => {
      setGenError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            asHost && hostKey ? { code, hostKey } : { code }
          ),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        load();
      } catch (err) {
        autoTriggered.current = false; // allow retry
        setGenError(err instanceof Error ? err.message : "Generation failed");
      }
    },
    [code, hostKey, load]
  );

  const deadlineMs = room?.deadline_at ? new Date(room.deadline_at).getTime() : null;
  const deadlinePassed = deadlineMs != null && deadlineMs <= now;

  // auto-trigger: everyone submitted, or the deadline passed with 2+ pitches
  useEffect(() => {
    if (room?.status !== "open" || autoTriggered.current) return;
    const full = participants.length >= room.max_participants;
    const deadlineReady = deadlinePassed && participants.length >= 2;
    if (full || deadlineReady) {
      autoTriggered.current = true;
      triggerGenerate(false);
    }
  }, [room?.status, room?.max_participants, participants.length, deadlinePassed, triggerGenerate]);

  // ── submit an idea ───────────────────────────────────────────────
  async function submitIdea(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, idea, hideName, hideIdea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      const label = hideName ? "Anonymous" : name.trim();
      localStorage.setItem(`hm-submitted-${code}`, label);
      setSubmittedAs(label);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(ideaId: string, emoji: string) {
    try {
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ideaId, emoji, device: deviceKey }),
      });
      load();
    } catch {
      // transient — next poll corrects the view
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // ── render states ────────────────────────────────────────────────
  if (notFound) {
    return (
      <Shell code={code}>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-3xl font-bold">Room not found</h1>
          <p className="mt-3 text-fog">
            Double-check the code — or the room may have been cleaned up.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-lg bg-honey px-6 py-3 font-semibold text-ink transition hover:bg-honey-dim"
          >
            Start a new session
          </Link>
        </div>
      </Shell>
    );
  }

  if (!room) {
    return (
      <Shell code={code}>
        <p className="animate-pulse-soft py-24 text-center text-fog">
          Loading room…
        </p>
      </Shell>
    );
  }

  const isHost = Boolean(hostKey);
  const submittedCount = participants.length;
  const max = room.max_participants;

  // ── DONE: results, voting, deep dives ────────────────────────────
  if (room.status === "done" && room.results) {
    return (
      <Shell code={code}>
        <ResultsView
          room={room}
          code={code}
          deviceKey={deviceKey}
          celebrate={celebrate}
          submittedCount={submittedCount}
        />
      </Shell>
    );
  }

  // ── GENERATING ───────────────────────────────────────────────────
  if (room.status === "generating") {
    return (
      <Shell code={code}>
        <div className="mx-auto max-w-md py-24 text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 animate-pulse-soft items-center justify-center rounded-2xl bg-honey text-3xl">
            🐝
          </div>
          <h1 className="text-3xl font-bold">Fusing your ideas…</h1>
          <p className="mt-3 text-fog">
            AI is pulling one element from each of the {submittedCount} pitches
            and building something new. This takes a few seconds.
          </p>
        </div>
      </Shell>
    );
  }

  // ── OPEN: submit / wait ──────────────────────────────────────────
  const remainingMs = deadlineMs != null ? Math.max(0, deadlineMs - now) : null;

  return (
    <Shell code={code}>
      <div className="grid gap-10 pb-20 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-honey">
            {room.event_name}
          </p>

          {/* progress */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <h1 className="text-3xl font-bold tracking-tight">
                {submittedAs ? "Waiting on the others" : "Pitch your idea"}
              </h1>
              <span className="text-sm text-fog">
                <span className="font-bold text-honey">{submittedCount}</span>
                {" / "}
                {max} submitted
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raise">
              <div
                className="h-full rounded-full bg-honey transition-all duration-700"
                style={{ width: `${(submittedCount / max) * 100}%` }}
              />
            </div>
            {remainingMs != null && (
              <p className="mt-3 text-sm text-fog">
                {remainingMs > 0 ? (
                  <>
                    ⏳ Pitch deadline in{" "}
                    <span
                      className={`font-bold tabular-nums ${
                        remainingMs < 60_000 ? "text-red-400" : "text-honey"
                      }`}
                    >
                      {formatCountdown(remainingMs)}
                    </span>{" "}
                    — fusion fires automatically at zero
                  </>
                ) : submittedCount >= 2 ? (
                  <span className="text-honey">
                    ⏳ Deadline reached — fusing with the pitches that made it…
                  </span>
                ) : (
                  <span className="text-red-400">
                    ⏳ Deadline passed — fusion starts as soon as a 2nd pitch lands
                  </span>
                )}
              </p>
            )}
          </div>

          {/* form or waiting card */}
          {submittedAs ? (
            <div className="mt-8 rounded-2xl border border-line bg-panel p-8">
              <h2 className="text-xl font-semibold">
                You&apos;re in{submittedAs === "Anonymous" ? "" : `, ${submittedAs}`} ✓
              </h2>
              <p className="mt-2 text-fog">
                Your pitch is locked. The moment{" "}
                {max - submittedCount === 0
                  ? "generation starts"
                  : `${max - submittedCount} more ${
                      max - submittedCount === 1 ? "person" : "people"
                    } submit`}
                , the AI fuses everything — this page updates live.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitIdea}
              className="mt-8 space-y-5 rounded-2xl border border-line bg-panel p-8"
            >
              {!hideName && (
                <div>
                  <label className="mb-1.5 block text-sm text-fog" htmlFor="name">
                    Your name
                  </label>
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rian"
                    maxLength={40}
                    required
                    className="w-full rounded-lg border border-line bg-raise px-4 py-3 text-snow placeholder:text-fog/50 focus:border-honey focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm text-fog" htmlFor="idea">
                  Your idea — one pitch, your own words
                </label>
                <textarea
                  id="idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="An app that turns campus food waste into a real-time free-food map for students…"
                  rows={5}
                  maxLength={600}
                  required
                  className="w-full resize-none rounded-lg border border-line bg-raise px-4 py-3 leading-relaxed text-snow placeholder:text-fog/50 focus:border-honey focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-fog/50">
                  {idea.length}/600
                </p>
              </div>

              {/* privacy toggles */}
              <fieldset className="rounded-xl border border-line bg-raise/50 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-fog">
                  Privacy
                </legend>
                <label className="flex cursor-pointer items-start gap-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={hideName}
                    onChange={(e) => setHideName(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#f6b93b]"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Hide my name</span>
                    <span className="block text-fog">
                      You&apos;ll appear as &ldquo;Anonymous&rdquo; everywhere —
                      in the room and in the final credits.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={hideIdea}
                    onChange={(e) => setHideIdea(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#f6b93b]"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Hide my idea</span>
                    <span className="block text-fog">
                      Your pitch text stays secret. It still shapes every
                      generated concept — credited only as a &ldquo;secret
                      ingredient&rdquo;.
                    </span>
                  </span>
                </label>
                {hideName && hideIdea && (
                  <p className="mt-2 border-t border-line pt-3 text-xs italic text-fog">
                    Fully incognito: nothing about you or your pitch is ever
                    shown — but the AI still weaves your idea into the results. 🐝
                  </p>
                )}
              </fieldset>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-honey px-4 py-3 font-semibold text-ink transition hover:bg-honey-dim disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Lock in my idea →"}
              </button>
              {formError && <p className="text-sm text-red-400">{formError}</p>}
            </form>
          )}

          {/* live pitch feed */}
          {participants.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-fog">
                Pitches so far
              </h3>
              <ul className="mt-3 space-y-3">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="card-lift rounded-xl border border-line bg-panel px-5 py-4"
                  >
                    <span
                      className={
                        p.label === "Anonymous"
                          ? "text-sm italic text-fog"
                          : "text-sm font-semibold text-snow"
                      }
                    >
                      {p.label}
                    </span>
                    {p.idea ? (
                      <>
                        <p className="mt-1 text-sm leading-relaxed text-fog">
                          {p.idea}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {REACTION_EMOJIS.map((emoji) => {
                            const count = p.reactions[emoji] ?? 0;
                            const mine = p.mine.includes(emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(p.id, emoji)}
                                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                  mine
                                    ? "border-honey bg-honey/15 text-snow"
                                    : "border-line text-fog hover:border-honey"
                                }`}
                              >
                                {emoji}
                                {count > 0 && <span className="ml-1">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-sm italic text-fog/60">
                        🔒 pitch kept private until the reveal… and after it
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {genError && <p className="mt-4 text-sm text-red-400">{genError}</p>}
        </div>

        {/* host / share panel */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-panel p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-fog">
              Invite the team
            </h3>
            <div className="mt-4 flex justify-center rounded-xl bg-snow p-4">
              {shareUrl && (
                <QRCodeSVG value={shareUrl} size={168} marginSize={0} />
              )}
            </div>
            <p className="mt-4 text-center text-2xl font-bold tracking-[0.3em] text-honey">
              {code}
            </p>
            <button
              onClick={copyLink}
              className="mt-4 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-honey hover:text-honey"
            >
              {copied ? "Copied ✓" : "Copy invite link"}
            </button>
          </div>

          {isHost && (
            <div className="rounded-2xl border border-line bg-panel p-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-fog">
                Host controls
              </h3>
              <p className="mt-2 text-sm text-fog">
                Someone bailed? Generate now with the {submittedCount}{" "}
                {submittedCount === 1 ? "idea" : "ideas"} you have.
              </p>
              <button
                onClick={() => triggerGenerate(true)}
                disabled={submittedCount < 2}
                className="mt-4 w-full rounded-lg bg-honey px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate now 🐝
              </button>
              {submittedCount < 2 && (
                <p className="mt-2 text-xs text-fog/60">
                  Needs at least 2 submitted ideas.
                </p>
              )}
              <a
                href={`/room/${code}/present`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block w-full rounded-lg border border-line px-4 py-2.5 text-center text-sm font-semibold transition hover:border-honey hover:text-honey"
              >
                Open presenter view ⧉
              </a>
              <p className="mt-2 text-xs text-fog/60">
                Big QR + live progress, made for a projector.
              </p>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Shell({ children, code }: { children: React.ReactNode; code: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6">
      <header className="flex items-center justify-between py-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <LogoMark />
          <span>
            Hive<span className="text-honey">Mind</span>
          </span>
        </Link>
        {code && (
          <span className="rounded-full border border-line px-3 py-1 text-xs tracking-widest text-fog">
            ROOM {code}
          </span>
        )}
      </header>
      {children}
    </main>
  );
}
