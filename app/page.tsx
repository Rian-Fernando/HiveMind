"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [groupSize, setGroupSize] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, maxParticipants: groupSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      // remember that this browser is the host of this room
      localStorage.setItem(`hm-host-${data.code}`, data.hostKey);
      router.push(`/room/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code) router.push(`/room/${code}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      {/* header */}
      <header className="flex items-center justify-between py-8">
        <span className="text-lg font-bold tracking-tight">
          Hive<span className="text-honey">Mind</span>
        </span>
        <a
          href="https://rianfernando.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-fog transition hover:text-snow"
        >
          by Rian Fernando
        </a>
      </header>

      {/* hero */}
      <section className="grid flex-1 items-center gap-14 py-12 md:grid-cols-2">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-honey">
            For hackathons &amp; team events
          </p>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Everyone pitches.
            <br />
            AI{" "}
            <em className="font-accent italic text-honey">fuses</em>
            <br />
            the best of each.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-fog">
            Spin up a room, share a link or QR code, and let every teammate
            pitch — openly or anonymously, their call. When the last idea
            lands, AI takes one element from each pitch and generates project
            ideas the whole hive owns.
          </p>

          <ol className="mt-10 space-y-3 text-sm text-fog">
            {[
              "Create a room and share the link or QR code",
              "Each person pitches — and chooses to hide their name, their idea, or both",
              "AI fuses one element from every pitch into 4 new concepts, crediting only who opted in",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-honey text-[11px] font-bold text-ink">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* create / join card */}
        <div className="rounded-2xl border border-line bg-panel p-8">
          <h2 className="text-xl font-semibold">Start a session</h2>
          <form onSubmit={createRoom} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-fog" htmlFor="event">
                Event or team name
              </label>
              <input
                id="event"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="HackAdelphi 2026 — Team Rocket"
                maxLength={80}
                required
                className="w-full rounded-lg border border-line bg-raise px-4 py-3 text-snow placeholder:text-fog/50 focus:border-honey focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-fog" htmlFor="size">
                How many people are pitching?
              </label>
              <input
                id="size"
                type="number"
                min={2}
                max={50}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
                required
                className="w-full rounded-lg border border-line bg-raise px-4 py-3 text-snow focus:border-honey focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-honey px-4 py-3 font-semibold text-ink transition hover:bg-honey-dim disabled:opacity-50"
            >
              {busy ? "Creating room…" : "Create room →"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-fog/60">
            <span className="h-px flex-1 bg-line" /> or join <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={joinRoom} className="flex gap-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Room code, e.g. K7XM2P"
              maxLength={6}
              className="w-full rounded-lg border border-line bg-raise px-4 py-3 uppercase tracking-widest text-snow placeholder:normal-case placeholder:tracking-normal placeholder:text-fog/50 focus:border-honey focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-line px-5 font-semibold text-snow transition hover:border-honey hover:text-honey"
            >
              Join
            </button>
          </form>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-fog/60">
        HiveMind · Next.js + Supabase + Gemini/Groq · runs entirely on free tiers
      </footer>
    </main>
  );
}
