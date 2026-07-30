import type { Metadata } from "next";
import Link from "next/link";
import { DemoWalkthrough } from "@/components/DemoWalkthrough";
import { LogoMark } from "@/components/LogoMark";
import { PORTFOLIO_URL, REPO_URL, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Walk through a complete HiveMind session step by step with sample data: create a room, pitch anonymously or openly, watch AI fuse every pitch into four new ideas, vote, and generate a build plan. No sign-up required.";

export const metadata: Metadata = {
  title: "Guided demo — see a full HiveMind session",
  description: DESCRIPTION,
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Guided demo — see a full HiveMind session",
    description: DESCRIPTION,
    url: "/demo",
  },
};

/** HowTo structured data — the demo literally documents the process. */
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to run a group ideation session with HiveMind",
  description: DESCRIPTION,
  url: `${SITE_URL}/demo`,
  totalTime: "PT10M",
  estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
  step: [
    {
      "@type": "HowToStep",
      name: "Create the room",
      text: "The host names the event, sets how many people are pitching, and optionally sets a countdown. No account is required.",
    },
    {
      "@type": "HowToStep",
      name: "Share the link or QR code",
      text: "Everyone joins through a link, a QR code, or a six-letter room code. A presenter view shows the QR code full screen for projectors.",
    },
    {
      "@type": "HowToStep",
      name: "Everyone pitches privately",
      text: "Each person submits exactly one idea without seeing the others, and chooses whether to hide their name, their idea text, or both.",
    },
    {
      "@type": "HowToStep",
      name: "AI fuses the pitches",
      text: "When the last pitch lands or the countdown expires, the AI takes the most distinctive element from every submission and generates four new project ideas.",
    },
    {
      "@type": "HowToStep",
      name: "Vote on the results",
      text: "The team votes with live tallies, one changeable vote per device, and the leading idea is highlighted.",
    },
    {
      "@type": "HowToStep",
      name: "Generate a build plan",
      text: "For the winning idea, generate MVP scope, a tech stack, a role for each teammate, and a first-hour checklist, then export everything as Markdown.",
    },
  ],
};

export default function DemoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <LogoMark />
          <span>
            Hive<span className="text-honey">Mind</span>
          </span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/#start" className="text-fog transition hover:text-snow">
            Create a room
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

      <main>
        <header className="mx-auto max-w-5xl px-6 pb-10">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-honey">
            Guided demo
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            See a whole session,{" "}
            <em className="font-accent italic text-honey">start to finish</em>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fog">
            This is a complete HiveMind session using sample data — a four-person
            hackathon team, one pitch each, every privacy setting represented.
            Step through it to see exactly what your team would see. Nothing is
            saved and no AI is called; use the arrow keys or the buttons to move.
          </p>
        </header>

        <DemoWalkthrough />

        <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            That&apos;s the whole flow
          </h2>
          <p className="mt-3 text-fog">
            A real session takes about ten minutes. It&apos;s free, and nobody
            needs an account.
          </p>
          <Link
            href="/#start"
            className="mt-6 inline-block rounded-lg bg-honey px-6 py-3 font-semibold text-ink transition hover:bg-honey-dim focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Create your own room →
          </Link>
        </section>
      </main>
    </>
  );
}
