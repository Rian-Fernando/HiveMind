"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  DEMO_CODE,
  DEMO_DEEP_DIVE,
  DEMO_EVENT,
  DEMO_PITCHES,
  DEMO_RESULTS,
  DEMO_VOTES,
} from "@/lib/demoData";
import { SITE_URL } from "@/lib/site";

/**
 * A guided, click-through tour of a complete HiveMind session using
 * sample data. No database writes and no AI calls — every screen here is
 * a faithful mock of the real UI, annotated with what is happening.
 */

const STEPS = [
  {
    key: "create",
    label: "Create",
    title: "One person sets up the room",
    body: "The host names the event, says how many people are pitching, and can set an optional countdown. That's the entire setup — no account, no sign-up.",
  },
  {
    key: "share",
    label: "Share",
    title: "Everyone joins from one link",
    body: "The host gets a link, a QR code, and a six-letter room code. On a projector, the presenter view shows the QR big enough to scan from the back row.",
  },
  {
    key: "pitch",
    label: "Pitch",
    title: "Each person submits one idea — privately",
    body: "Nobody sees anyone else's idea before submitting their own. Two independent toggles let each person hide their name, their idea text, or both.",
  },
  {
    key: "wait",
    label: "Wait",
    title: "The room fills up live",
    body: "Visible pitches appear as they land and can be reacted to. Hidden pitches show as locked. When the last person submits — or the countdown hits zero — fusion starts automatically.",
  },
  {
    key: "fuse",
    label: "Fuse",
    title: "The AI fuses every pitch",
    body: "It pulls the most distinctive element out of each submission and builds four new ideas from them. One AI call per room, a few seconds.",
  },
  {
    key: "results",
    label: "Results",
    title: "Four ideas, credited by privacy choice",
    body: "Each idea shows which element came from whom — and respects what each person chose. This is where the real conversation starts.",
  },
  {
    key: "vote",
    label: "Vote",
    title: "The team votes",
    body: "One changeable vote per device, with live tallies. The leading idea is crowned as opinion moves.",
  },
  {
    key: "build",
    label: "Build",
    title: "Turn the winner into a build plan",
    body: "One tap generates MVP scope, a stack with reasoning, a role for each teammate, and a first-hour checklist. It's cached, so the whole room sees it instantly.",
  },
] as const;

export function DemoWalkthrough() {
  const [step, setStep] = useState(0);
  const [votedFor, setVotedFor] = useState<number | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const next = useCallback(
    () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
    []
  );
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  // arrow-key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  const current = STEPS[step];

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24">
      {/* progress rail */}
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="Demo steps">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                i === step
                  ? "bg-honey text-ink"
                  : i < step
                    ? "border border-honey/40 text-honey"
                    : "border border-line text-fog hover:border-honey/60"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── the stage ── */}
        <div
          key={current.key}
          className="animate-rise-in rounded-2xl border border-line bg-panel/80 p-6 backdrop-blur-sm md:p-8"
        >
          {current.key === "create" && <StageCreate />}
          {current.key === "share" && <StageShare />}
          {current.key === "pitch" && <StagePitch />}
          {current.key === "wait" && <StageWait />}
          {current.key === "fuse" && <StageFuse />}
          {current.key === "results" && <StageResults votedFor={null} onVote={() => {}} />}
          {current.key === "vote" && (
            <StageResults votedFor={votedFor} onVote={setVotedFor} showTallies />
          )}
          {current.key === "build" && (
            <StageBuild open={planOpen} setOpen={setPlanOpen} />
          )}
        </div>

        {/* ── narration ── */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-honey/30 bg-raise/80 p-6 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-honey">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-2 text-xl font-bold">{current.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-fog">{current.body}</p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={back}
                disabled={step === 0}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-honey hover:text-honey disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  className="flex-1 rounded-lg bg-honey px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-dim"
                >
                  Next →
                </button>
              ) : (
                <Link
                  href="/#start"
                  className="flex-1 rounded-lg bg-honey px-4 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-honey-dim"
                >
                  Create a real room →
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-fog">
              Sample data — nothing here is saved, and no AI is called.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── stages ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm text-fog">{label}</span>
      <div className="rounded-lg border border-line bg-raise px-4 py-3 text-snow">
        {value}
      </div>
    </div>
  );
}

function StageCreate() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-lg font-semibold">Start a session</h3>
      <Field label="Event or team name" value={DEMO_EVENT} />
      <Field label="How many people are pitching?" value="4" />
      <div className="rounded-xl border border-line bg-raise/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            <span className="font-semibold">Pitch deadline</span>
            <span className="block text-fog">
              Optional — fusion auto-fires when time runs out
            </span>
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-honey text-[10px] font-bold text-ink">
            ✓
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-line bg-raise px-4 py-2.5 text-sm">
          10 minutes
        </div>
      </div>
      <div className="w-full rounded-lg bg-honey px-4 py-3 text-center font-semibold text-ink">
        Create room →
      </div>
    </div>
  );
}

function StageShare() {
  return (
    <div className="grid items-center gap-8 sm:grid-cols-2">
      <div className="flex flex-col items-center">
        <div className="rounded-xl bg-snow p-4">
          <QRCodeSVG value={`${SITE_URL}/room/${DEMO_CODE}`} size={168} marginSize={0} />
        </div>
        <p className="mt-4 text-center text-2xl font-bold tracking-[0.3em] text-honey">
          {DEMO_CODE}
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Invite the team</h3>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          Scan the code, tap the link, or type the six letters. Anyone with the
          link can pitch — there is nothing to install and nothing to sign into.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <div className="rounded-lg border border-line px-4 py-2.5 text-fog">
            Copy invite link
          </div>
          <div className="rounded-lg border border-line px-4 py-2.5 text-fog">
            Open presenter view ⧉
          </div>
        </div>
      </div>
    </div>
  );
}

function StagePitch() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h3 className="text-lg font-semibold">Pitch your idea</h3>
      <Field label="Your name" value="Rian" />
      <div>
        <span className="mb-1.5 block text-sm text-fog">
          Your idea — one pitch, your own words
        </span>
        <div className="rounded-lg border border-line bg-raise px-4 py-3 leading-relaxed text-snow">
          {DEMO_PITCHES[0].idea}
        </div>
      </div>
      <fieldset className="rounded-xl border border-line bg-raise/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-fog">
          Privacy
        </legend>
        {[
          {
            t: "Hide my name",
            d: "You'll appear as “Anonymous” everywhere — in the room and in the final credits.",
          },
          {
            t: "Hide my idea",
            d: "Your pitch text stays secret. It still shapes every generated concept — credited only as a “secret ingredient”.",
          },
        ].map((o) => (
          <div key={o.t} className="flex items-start gap-3 py-1.5">
            <span className="mt-1 h-4 w-4 shrink-0 rounded-sm border border-fog/60" />
            <span className="text-sm">
              <span className="font-semibold">{o.t}</span>
              <span className="block text-fog">{o.d}</span>
            </span>
          </div>
        ))}
      </fieldset>
      <div className="w-full rounded-lg bg-honey px-4 py-3 text-center font-semibold text-ink">
        Lock in my idea →
      </div>
    </div>
  );
}

function StageWait() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Waiting on the others</h3>
        <span className="text-sm text-fog">
          <span className="font-bold text-honey">4</span> / 4 submitted
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raise">
        <div className="h-full w-full rounded-full bg-honey" />
      </div>
      <p className="mt-3 text-sm text-fog">
        ⏳ Pitch deadline in{" "}
        <span className="font-bold tabular-nums text-honey">2:14</span> — fusion
        fires automatically at zero
      </p>

      <ul className="mt-6 space-y-3">
        {DEMO_PITCHES.map((p, i) => (
          <li key={i} className="rounded-xl border border-line bg-panel px-5 py-4">
            <span
              className={
                p.hideName
                  ? "text-sm italic text-fog"
                  : "text-sm font-semibold text-snow"
              }
            >
              {p.label}
            </span>
            {p.idea ? (
              <>
                <p className="mt-1 text-sm leading-relaxed text-fog">{p.idea}</p>
                <div className="mt-3 flex gap-2">
                  {(["🔥", "💡", "😂"] as const).map((e) => (
                    <span
                      key={e}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        p.reactions[e]
                          ? "border-honey bg-honey/15 text-snow"
                          : "border-line text-fog"
                      }`}
                    >
                      {e}
                      {p.reactions[e] ? (
                        <span className="ml-1">{p.reactions[e]}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm italic text-fog">
                🔒 pitch kept private until the reveal… and after it
              </p>
            )}
            <p className="mt-3 border-t border-line pt-3 text-xs text-honey">
              {p.note}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageFuse() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex h-16 w-16 animate-pulse-soft items-center justify-center rounded-2xl bg-honey text-3xl">
        🐝
      </div>
      <h3 className="mt-8 text-2xl font-bold">Fusing your ideas…</h3>
      <p className="mt-3 text-fog">
        AI is pulling one element from each of the 4 pitches and building
        something new. This takes a few seconds.
      </p>
      <div className="mx-auto mt-8 max-w-sm space-y-2 text-left text-xs text-fog">
        {[
          "Reading 4 pitches",
          "Extracting the distinctive element from each",
          "Combining into 4 new concepts",
          "Masking credits per privacy choice",
        ].map((l) => (
          <p key={l} className="flex gap-2">
            <span className="text-honey">▸</span> {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function StageResults({
  votedFor,
  onVote,
  showTallies = false,
}: {
  votedFor: number | null;
  onVote: (i: number) => void;
  showTallies?: boolean;
}) {
  const tallies = DEMO_VOTES.map((v, i) => v + (votedFor === i ? 1 : 0));
  const max = Math.max(...tallies);
  const leader = tallies.filter((t) => t === max).length === 1 ? tallies.indexOf(max) : null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-honey">
        {DEMO_EVENT}
      </p>
      <h3 className="mt-2 text-2xl font-bold">
        4 ideas,{" "}
        <em className="font-accent italic text-honey">fused from 4 minds</em>
      </h3>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {DEMO_RESULTS.map((fi, i) => (
          <article
            key={fi.title}
            className={`flex flex-col rounded-2xl border bg-panel p-5 ${
              showTallies && leader === i ? "border-honey/70" : "border-line"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-fog">
                {String(i + 1).padStart(2, "0")}
              </span>
              {showTallies && leader === i && (
                <span className="rounded-full bg-honey px-2.5 py-0.5 text-xs font-bold text-ink">
                  👑 leading
                </span>
              )}
            </div>
            <h4 className="mt-1.5 text-lg font-bold">{fi.title}</h4>
            <p className="font-accent italic text-honey">{fi.tagline}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-fog">
              {fi.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {fi.elements.map((el, j) => (
                <span
                  key={j}
                  className="rounded-full border border-line bg-raise px-2.5 py-1 text-[11px] text-fog"
                >
                  <span
                    className={
                      el.author === "Anonymous"
                        ? "italic"
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
            {showTallies && (
              <button
                onClick={() => onVote(i)}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  votedFor === i
                    ? "bg-honey text-ink"
                    : "border border-line text-snow hover:border-honey hover:text-honey"
                }`}
              >
                {votedFor === i ? "Your pick ✓" : "Vote for this"} · {tallies[i]}
              </button>
            )}
          </article>
        ))}
      </div>

      <p className="mt-6 text-center text-sm italic text-fog">
        …plus 1 fully private contribution fused in without a trace. 🐝
      </p>
      {showTallies && (
        <p className="mt-2 text-center text-sm text-fog">
          {tallies.reduce((a, b) => a + b, 0)} votes in
          {leader != null && (
            <>
              {" "}
              — <span className="font-semibold text-honey">
                {DEMO_RESULTS[leader].title}
              </span>{" "}
              is leading
            </>
          )}
        </p>
      )}
    </div>
  );
}

function StageBuild({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const idea = DEMO_RESULTS[1];
  const d = DEMO_DEEP_DIVE;

  return (
    <div>
      <div className="rounded-2xl border border-honey/60 bg-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-honey px-2.5 py-0.5 text-xs font-bold text-ink">
              👑 winner
            </span>
            <h3 className="mt-2 text-xl font-bold">{idea.title}</h3>
            <p className="font-accent italic text-honey">{idea.tagline}</p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="mt-5 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-honey hover:text-honey"
          >
            Build plan →
          </button>
        )}
      </div>

      {open && (
        <div className="animate-rise-in mt-5 rounded-2xl border border-line bg-raise/60 p-6">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-honey">
              Build plan
            </p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-2.5 py-1 text-xs text-fog transition hover:border-honey hover:text-honey"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-snow">{d.overview}</p>

          <PlanSection title="MVP — this is the demo">
            {d.mvp_features.map((f) => (
              <li key={f} className="flex gap-2 text-fog">
                <span className="text-honey">▸</span> {f}
              </li>
            ))}
          </PlanSection>
          <PlanSection title="Stack">
            {d.tech_stack.map((t) => (
              <li key={t.layer} className="text-fog">
                <span className="font-semibold text-snow">{t.layer}:</span>{" "}
                {t.choice} <span className="text-fog">— {t.why}</span>
              </li>
            ))}
          </PlanSection>
          <PlanSection title="Who does what">
            {d.roles.map((r) => (
              <li key={r.member} className="text-fog">
                <span className="font-semibold text-snow">{r.member}</span> —{" "}
                {r.focus}
              </li>
            ))}
          </PlanSection>
          <PlanSection title="First hour">
            {d.first_hour.map((s, i) => (
              <li key={s} className="flex gap-2 text-fog">
                <span className="font-bold text-honey">{i + 1}.</span> {s}
              </li>
            ))}
          </PlanSection>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5 text-sm">
            <span className="rounded-lg border border-line px-4 py-2 text-fog">
              Copy as Markdown
            </span>
            <span className="rounded-lg border border-line px-4 py-2 text-fog">
              Download .md
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-honey">
        {title}
      </h4>
      <ul className="space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}
