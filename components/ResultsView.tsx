"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { DeepDive, GenerationResults, Room, VoteState } from "@/lib/types";

interface Props {
  room: Room;
  code: string;
  deviceKey: string;
  /** true only on the live transition into "done" — fires the confetti */
  celebrate: boolean;
  submittedCount: number;
}

export function ResultsView({ room, code, deviceKey, celebrate, submittedCount }: Props) {
  const results = room.results as GenerationResults;
  const [votes, setVotes] = useState<VoteState | null>(null);
  // deep-dive modal state: which idea is open, and whether it's generating
  const [diveOpen, setDiveOpen] = useState<number | null>(null);
  const [diveLoading, setDiveLoading] = useState(false);
  const [diveError, setDiveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const celebrated = useRef(false);

  // ── confetti on the live reveal ──────────────────────────────────
  useEffect(() => {
    if (!celebrate || celebrated.current) return;
    celebrated.current = true;
    const brand = ["#F6B93B", "#F4EFE7", "#C8901A"];
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.25 }, colors: brand });
    setTimeout(
      () => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.5 }, colors: brand }),
      250
    );
    setTimeout(
      () => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.5 }, colors: brand }),
      450
    );
  }, [celebrate]);

  // ── votes ────────────────────────────────────────────────────────
  const loadVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/votes?code=${code}&device=${deviceKey}`);
      if (res.ok) setVotes(await res.json());
    } catch {
      // transient — realtime/polling will retry
    }
  }, [code, deviceKey]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes, room.updated_at]); // re-fetch whenever the room row bumps

  async function castVote(ideaIndex: number) {
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ideaIndex, device: deviceKey }),
      });
      if (res.ok) setVotes(await res.json());
    } catch {
      // ignore; next poll corrects the view
    }
  }

  // ── deep dive (modal) ────────────────────────────────────────────
  const openDeepDive = useCallback(
    async (ideaIndex: number) => {
      setDiveOpen(ideaIndex);
      setDiveError(null);
      if (results.ideas[ideaIndex].deep_dive) return; // cached — just show it

      setDiveLoading(true);
      try {
        const res = await fetch("/api/deepdive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, ideaIndex }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Deep dive failed");
        // mutate local copy so the plan shows without waiting for realtime
        results.ideas[ideaIndex].deep_dive = data.deepDive;
      } catch (err) {
        setDiveError(err instanceof Error ? err.message : "Deep dive failed");
      } finally {
        setDiveLoading(false);
      }
    },
    [code, results]
  );

  const closeDive = useCallback(() => {
    if (!diveLoading) setDiveOpen(null);
  }, [diveLoading]);

  // lock body scroll + close on Escape while the modal is open
  useEffect(() => {
    if (diveOpen === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDive();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [diveOpen, closeDive]);

  // ── export ───────────────────────────────────────────────────────
  function toMarkdown(): string {
    const lines: string[] = [
      `# ${room.event_name} — HiveMind results`,
      "",
      `${results.ideas.length} ideas fused from ${submittedCount} pitches.`,
      "",
    ];
    const leader = leaderIndex();
    results.ideas.forEach((fi, i) => {
      const voteNote =
        votes && votes.total > 0
          ? ` (${votes.tallies[i] ?? 0} vote${(votes.tallies[i] ?? 0) === 1 ? "" : "s"}${i === leader ? " 👑" : ""})`
          : "";
      lines.push(`## ${i + 1}. ${fi.title}${voteNote}`);
      lines.push(`*${fi.tagline}*`, "", fi.description, "");
      if (fi.elements.length > 0) {
        lines.push(
          "**Fused from:** " +
            fi.elements.map((el) => `${el.author} (${el.element})`).join(" · "),
          ""
        );
      }
      const dive = fi.deep_dive;
      if (dive) {
        lines.push(`### Build plan`, "", dive.overview, "", "**MVP:**");
        dive.mvp_features.forEach((f) => lines.push(`- ${f}`));
        lines.push("", "**Stack:**");
        dive.tech_stack.forEach((t) => lines.push(`- ${t.layer}: ${t.choice} — ${t.why}`));
        lines.push("", "**Roles:**");
        dive.roles.forEach((r) => lines.push(`- ${r.member}: ${r.focus}`));
        lines.push("", "**First hour:**");
        dive.first_hour.forEach((s, j) => lines.push(`${j + 1}. ${s}`));
        lines.push("");
      }
    });
    if (results.hidden_contributions > 0) {
      lines.push(
        `*Plus ${results.hidden_contributions} fully private contribution(s) fused in without attribution.*`,
        ""
      );
    }
    lines.push(`— generated with HiveMind · hivemind.rianfernando.com`);
    return lines.join("\n");
  }

  function copyMarkdown() {
    navigator.clipboard.writeText(toMarkdown()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadMarkdown() {
    const blob = new Blob([toMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hivemind-${code.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function leaderIndex(): number | null {
    if (!votes || votes.total === 0) return null;
    const max = Math.max(...votes.tallies);
    const leaders = votes.tallies.filter((t) => t === max);
    if (leaders.length !== 1) return null; // tie — no crown yet
    return votes.tallies.indexOf(max);
  }

  const leader = leaderIndex();
  const openIdea = diveOpen !== null ? results.ideas[diveOpen] : null;

  return (
    <div className="pb-20">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-honey">
        {room.event_name}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {results.ideas.length} ideas,{" "}
          <em className="font-accent italic text-honey">
            fused from {submittedCount} minds
          </em>
        </h1>
        <div className="flex gap-2">
          <button
            onClick={copyMarkdown}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:border-honey hover:text-honey"
          >
            {copied ? "Copied ✓" : "Copy as Markdown"}
          </button>
          <button
            onClick={downloadMarkdown}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:border-honey hover:text-honey"
          >
            Download .md
          </button>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-fog">
        Now the human part: argue about these loudly, then vote. Tap a card&apos;s{" "}
        <span className="text-snow">Build plan</span> when the team is ready to commit.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {results.ideas.map((fi, i) => {
          const voteCount = votes?.tallies[i] ?? 0;
          const isMyVote = votes?.myVote === i;
          const isLeader = leader === i;
          return (
            <article
              key={i}
              style={{ animationDelay: `${i * 130}ms` }}
              className={`card-lift animate-rise-in flex flex-col rounded-2xl border bg-panel p-7 ${
                isLeader ? "border-honey/70" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-fog/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {isLeader && (
                  <span className="rounded-full bg-honey px-2.5 py-0.5 text-xs font-bold text-ink">
                    👑 leading
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-bold">{fi.title}</h2>
              <p className="mt-1 font-accent text-lg italic text-honey">{fi.tagline}</p>
              <p className="mt-4 flex-1 leading-relaxed text-fog">{fi.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {fi.elements.map((el, j) => (
                  <span
                    key={j}
                    className="rounded-full border border-line bg-raise px-3 py-1 text-xs text-fog"
                  >
                    <span
                      className={
                        el.author === "Anonymous"
                          ? "italic text-fog"
                          : "font-semibold text-snow"
                      }
                    >
                      {el.author}
                    </span>{" "}
                    ·{" "}
                    {el.element === "secret ingredient" ? (
                      <span className="italic">secret ingredient 🤫</span>
                    ) : (
                      el.element
                    )}
                  </span>
                ))}
              </div>

              {/* vote + deep dive actions */}
              <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <button
                  onClick={() => castVote(i)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    isMyVote
                      ? "bg-honey text-ink"
                      : "border border-line text-snow hover:border-honey hover:text-honey"
                  }`}
                >
                  {isMyVote ? "Your pick ✓" : "Vote for this"}
                  {voteCount > 0 && (
                    <span className={isMyVote ? "text-ink/70" : "text-fog"}>
                      {" "}
                      · {voteCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => openDeepDive(i)}
                  className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-snow transition hover:border-honey hover:text-honey"
                >
                  Build plan →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {votes && votes.total > 0 && (
        <p className="mt-8 text-center text-sm text-fog">
          {votes.total} vote{votes.total === 1 ? "" : "s"} in
          {leader != null && (
            <>
              {" "}
              — <span className="font-semibold text-honey">{results.ideas[leader].title}</span>{" "}
              is leading
            </>
          )}
        </p>
      )}

      {results.hidden_contributions > 0 && (
        <p className="mt-6 text-center text-sm italic text-fog">
          …plus {results.hidden_contributions} fully private{" "}
          {results.hidden_contributions === 1 ? "contribution" : "contributions"} fused
          in without a trace. 🐝
        </p>
      )}

      <p className="mt-6 text-center text-xs text-fog/50">
        Generated by{" "}
        {results.provider === "gemini" ? "Google Gemini" : "Groq · Llama 3.3"}
      </p>

      {/* ── build-plan modal ─────────────────────────────────────── */}
      {diveOpen !== null && openIdea && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={closeDive}
          role="dialog"
          aria-modal="true"
          aria-label={`Build plan for ${openIdea.title}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-rise-in flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-honey/40 bg-panel"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-honey">
                  Build plan
                </p>
                <h2 className="mt-1 text-2xl font-bold">{openIdea.title}</h2>
                <p className="font-accent italic text-honey">{openIdea.tagline}</p>
              </div>
              <button
                onClick={closeDive}
                aria-label="Close"
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-fog transition hover:border-honey hover:text-honey"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-7 py-6">
              {diveLoading ? (
                <div className="py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 animate-pulse-soft items-center justify-center rounded-2xl bg-honey text-2xl">
                    🐝
                  </div>
                  <p className="mt-5 font-semibold">Planning the build…</p>
                  <p className="mt-1 text-sm text-fog">
                    Scoping an MVP, picking a stack, splitting the roles. ~15 seconds.
                  </p>
                </div>
              ) : diveError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-400">{diveError}</p>
                  <button
                    onClick={() => openDeepDive(diveOpen)}
                    className="mt-4 rounded-lg bg-honey px-5 py-2 text-sm font-semibold text-ink transition hover:bg-honey-dim"
                  >
                    Try again
                  </button>
                </div>
              ) : openIdea.deep_dive ? (
                <DeepDivePanel dive={openIdea.deep_dive} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeepDivePanel({ dive }: { dive: DeepDive }) {
  return (
    <div className="space-y-6 text-sm">
      <p className="leading-relaxed text-snow">{dive.overview}</p>

      <Section title="MVP — this is the demo">
        <ul className="space-y-1.5">
          {dive.mvp_features.map((f, i) => (
            <li key={i} className="flex gap-2 text-fog">
              <span className="text-honey">▸</span> {f}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Stack">
        <ul className="space-y-1.5">
          {dive.tech_stack.map((t, i) => (
            <li key={i} className="text-fog">
              <span className="font-semibold text-snow">{t.layer}:</span> {t.choice}{" "}
              <span className="text-fog/60">— {t.why}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Who does what">
        <ul className="space-y-1.5">
          {dive.roles.map((r, i) => (
            <li key={i} className="text-fog">
              <span className="font-semibold text-snow">{r.member}</span> — {r.focus}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="First hour">
        <ol className="space-y-1.5">
          {dive.first_hour.map((s, i) => (
            <li key={i} className="flex gap-2 text-fog">
              <span className="font-bold text-honey">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
      </Section>

      {dive.stretch_goals.length > 0 && (
        <Section title="If there's time">
          <ul className="space-y-1.5">
            {dive.stretch_goals.map((g, i) => (
              <li key={i} className="flex gap-2 text-fog">
                <span className="text-fog/50">＋</span> {g}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-honey">
        {title}
      </h4>
      {children}
    </div>
  );
}
