import type { Metadata } from "next";
import Link from "next/link";
import { CreateRoomPanel } from "@/components/CreateRoomPanel";
import { LogoMark } from "@/components/LogoMark";
import { HiveBackdrop } from "@/components/three/HiveBackdrop";
import { FAQ, PORTFOLIO_URL, REPO_URL, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "HiveMind — group ideation for hackathons, fused by AI",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

/** FAQPage structured data — AI answer engines and Google both read this. */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const STEPS = [
  {
    title: "One person creates the room",
    body: "Name the event, say how many people are pitching, and optionally set a countdown. You get a shareable link, a QR code, and a six-letter room code. No account, no sign-up.",
  },
  {
    title: "Everyone pitches privately",
    body: "Each teammate submits exactly one idea without seeing anyone else's first, so nobody anchors on whoever spoke loudest. Each person chooses whether their name and their idea text are public or hidden.",
  },
  {
    title: "The AI fuses every pitch",
    body: "When the last idea lands — or the countdown expires — the AI pulls the single most distinctive element out of every submission and combines them into four new project ideas, showing which element came from whom.",
  },
  {
    title: "The team argues, votes, and builds",
    body: "Everyone votes on the four ideas with live tallies. For any idea, one tap generates a build plan: MVP scope, a tech stack, a role for each teammate, and a first-hour checklist you can start on immediately.",
  },
];

const FEATURES = [
  {
    title: "Anonymous or credited — per person",
    body: "Hide your name, your idea text, or both. A fully hidden pitch still shapes every generated idea; it just never appears in the credits.",
  },
  {
    title: "Fusion, not averaging",
    body: "The AI is instructed to find what is distinctive in each pitch — a mechanic, an audience, a constraint — and to build ideas that carry a piece of every person.",
  },
  {
    title: "Live voting round",
    body: "Once results land, one changeable vote per device, with real-time tallies and the leading idea crowned as opinion shifts.",
  },
  {
    title: "AI build plans",
    body: "Turn any fused idea into a scoped hackathon plan: MVP features, stack choices with reasoning, role split, stretch goals, and the first hour.",
  },
  {
    title: "Presenter view for projectors",
    body: "A full-screen view with a giant QR code and a live submission counter, then big result cards with live vote tallies for the reveal.",
  },
  {
    title: "Export and keep",
    body: "Copy the whole session as Markdown or download a .md file, including votes and build plans, ready to paste into Notion, Discord, or a README.",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <HiveBackdrop storyId="story" />

      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8"
      >
        <span className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <LogoMark />
          <span>
            Hive<span className="text-honey">Mind</span>
          </span>
        </span>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/demo" className="text-fog transition hover:text-snow">
            Demo
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-fog transition hover:text-snow sm:inline"
          >
            GitHub
          </a>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-fog transition hover:text-snow"
          >
            by Rian Fernando
          </a>
        </div>
      </nav>

      <main id="main">
        {/* ── scroll-driven story (drives the 3D scene behind it) ── */}
        <div id="story">
          <section className="mx-auto grid min-h-[86vh] max-w-5xl items-center gap-12 px-6 py-8 md:grid-cols-2">
            <div className="story-copy">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-honey">
                For hackathons &amp; team events
              </p>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Everyone pitches.
                <br />
                AI <em className="font-accent italic text-honey">fuses</em>
                <br />
                the best of each.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-fog">
                HiveMind is a free tool for hackathon teams. Everyone submits one
                idea privately — openly or anonymously — and AI combines one
                element from every pitch into four new ideas the whole team owns.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#start"
                  className="rounded-lg bg-honey px-6 py-3 font-semibold text-ink transition hover:bg-honey-dim focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Create a room — free
                </a>
                <Link
                  href="/demo"
                  className="rounded-lg border border-line px-6 py-3 font-semibold text-snow transition hover:border-honey hover:text-honey focus-visible:ring-2 focus-visible:ring-honey"
                >
                  Watch the 60-second demo
                </Link>
              </div>
              <p className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-fog">
                <span
                  aria-hidden="true"
                  className="inline-block h-8 w-px bg-gradient-to-b from-transparent to-honey"
                />
                Scroll to watch the ideas fuse
              </p>
            </div>
            <div id="start" className="scroll-mt-24">
              <CreateRoomPanel />
            </div>
          </section>

          <section className="story-copy mx-auto flex min-h-[72vh] max-w-3xl flex-col justify-center px-6 py-14">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Every pitch lands in{" "}
              <em className="font-accent italic text-honey">its own cell</em>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fog">
              Nobody sees anyone else&apos;s idea before submitting their own, so
              the loudest voice in the room stops setting the agenda. Each person
              decides how visible they want to be: show your name, hide it, keep
              your pitch text secret, or stay completely anonymous.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-fog">
              A hidden pitch is not a discarded pitch. It still shapes every idea
              the AI generates — it simply never appears in the credits.
            </p>
          </section>

          <section className="story-copy mx-auto flex min-h-[72vh] max-w-3xl flex-col justify-center px-6 py-14">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Then the hive{" "}
              <em className="font-accent italic text-honey">fuses them</em>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fog">
              The AI reads every pitch, finds the single most distinctive element
              in each one — a mechanic, an audience, a technology, a constraint —
              and builds four new project ideas that each carry a piece of
              everybody&apos;s thinking.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-fog">
              It runs once per room, not once per person, and takes a few seconds.
            </p>
          </section>

          <section className="story-copy mx-auto flex min-h-[72vh] max-w-3xl flex-col justify-center px-6 py-14">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Four ideas the{" "}
              <em className="font-accent italic text-honey">whole team owns</em>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fog">
              Results arrive with each idea showing exactly which element came
              from which teammate. That is the point where the real conversation
              starts: argue, vote, and when you have decided, generate a build
              plan and start building.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-lg bg-honey px-6 py-3 font-semibold text-ink transition hover:bg-honey-dim focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                See it end to end →
              </Link>
            </div>
          </section>
        </div>

        {/* ── how it works ── */}
        <section
          aria-labelledby="how"
          className="reveal-on-scroll mx-auto max-w-5xl px-6 py-16"
        >
          <h2 id="how" className="text-3xl font-bold tracking-tight md:text-4xl">
            How HiveMind works
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-fog">
            A full session takes about ten minutes, start to finish.
          </p>
          <ol className="mt-12 grid gap-8 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-panel/70 p-7 backdrop-blur-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-honey text-sm font-bold text-ink">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-fog">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── features ── */}
        <section
          aria-labelledby="features"
          className="reveal-on-scroll mx-auto max-w-5xl px-6 py-16"
        >
          <h2
            id="features"
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            What you get
          </h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-line bg-panel/70 p-6 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── who it's for ── */}
        <section
          aria-labelledby="who"
          className="reveal-on-scroll mx-auto max-w-3xl px-6 py-16"
        >
          <div className="rounded-2xl border border-line bg-panel/75 p-8 backdrop-blur-md">
            <h2
              id="who"
              className="text-3xl font-bold tracking-tight md:text-4xl"
            >
              Who it&apos;s for
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fog">
              HiveMind is built for hackathon teams forming an idea in the first
              hour, student clubs and class project groups deciding what to
              build, and workshop facilitators who need everyone in the room
              contributing rather than three people talking. It works for teams
              of 2 to 50, on phones and laptops at the same time.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          aria-labelledby="faq"
          className="reveal-on-scroll mx-auto max-w-3xl px-6 py-16"
        >
          <div className="rounded-2xl border border-line bg-panel/75 p-8 backdrop-blur-md">
            <h2
              id="faq"
              className="text-3xl font-bold tracking-tight md:text-4xl"
            >
              Frequently asked questions
            </h2>
            <dl className="mt-10 space-y-7">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="border-b border-line pb-7 last:border-0 last:pb-0">
                  <dt className="text-xl font-semibold">{q}</dt>
                  <dd className="mt-3 leading-relaxed text-fog">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── closing CTA ── */}
        <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Get your team pitching
          </h2>
          <p className="mt-4 text-lg text-fog">
            Free, no account, works on any phone. Share one link and go.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#start"
              className="rounded-lg bg-honey px-6 py-3 font-semibold text-ink transition hover:bg-honey-dim focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Create a room
            </a>
            <Link
              href="/demo"
              className="rounded-lg border border-line px-6 py-3 font-semibold text-snow transition hover:border-honey hover:text-honey focus-visible:ring-2 focus-visible:ring-honey"
            >
              Try the demo first
            </Link>
          </div>
          <p className="mt-10 text-sm text-fog">
            Open source on{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-snow underline decoration-honey underline-offset-4 hover:text-honey"
            >
              GitHub
            </a>
          </p>
        </section>
      </main>
    </>
  );
}
