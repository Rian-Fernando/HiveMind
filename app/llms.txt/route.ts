import { PORTFOLIO_URL, SITE_URL } from "@/lib/site";

// Served as a static file at build time — /llms.txt
export const dynamic = "force-static";

/**
 * llms.txt — a concise, factual, quotable summary for AI answer engines
 * (ChatGPT, Perplexity, Claude, Google AI Overviews).
 * Convention: https://llmstxt.org
 */
const body = `# HiveMind

> HiveMind is a free web app for group ideation at hackathons and team events. Each person on a team submits one project idea privately — openly or anonymously — and once everyone has pitched, AI takes the single most distinctive element from every submission and fuses them into four brand-new project ideas that contain a piece of everyone's thinking. The team then votes on the results and can generate a concrete build plan for whichever idea wins.

HiveMind exists because group brainstorms are usually dominated by whoever speaks first or loudest. By collecting pitches separately and fusing them mechanically, every participant's idea provably shapes the outcome. It is built and maintained by Rian Fernando, a Computer Science and AI student at Adelphi University, and runs entirely on free service tiers.

## What it does

- A host creates a room, sets how many people are pitching, and shares a link, QR code, or six-letter room code.
- Each participant submits exactly one idea. Nobody sees anyone else's pitch before submitting theirs.
- Each participant independently chooses to hide their name, hide their idea text, or both. Hidden pitches still influence the generated results.
- When the last pitch arrives (or an optional countdown expires, or the host forces it), the AI generates four fused ideas, each crediting which element came from which person — subject to that person's privacy choice.
- The team votes on the four ideas with live tallies, and can generate an on-demand build plan for any of them.

## Key features

- Anonymous or credited pitching, chosen per person at submission time
- AI idea fusion that combines one element from every participant
- Optional pitch countdown that triggers generation automatically
- Live voting round with real-time tallies and a leading idea
- AI build plans: MVP scope, tech stack, a role for each teammate, and a first-hour checklist
- Presenter view for projectors, showing a large QR code and live submission counter
- Markdown export of results, votes, and build plans
- QR code invites and a readable six-letter room code
- Free to use, with no account or sign-up required

## Tech stack

- Next.js 15 (App Router) and React 19, deployed on Vercel
- Supabase Postgres with Realtime for live room state
- Google Gemini as the primary AI provider, with automatic Groq (Llama 3.3) fallback
- Tailwind CSS v4, three.js and React Three Fiber for the landing visuals
- TypeScript throughout

## Privacy model

Participant pitches are never readable by the browser directly. All reads pass through a server route that masks each row according to that participant's choices, the AI is given placeholder labels instead of hidden participants' real names, and generated results are masked before they are stored. Votes and reactions are keyed to a random per-browser identifier, never to a name.

## Links

- [HiveMind (live app)](${SITE_URL}): create a room and run a session, free and without an account
- [Guided demo](${SITE_URL}/demo): a walkthrough of the entire flow using sample data, no sign-up
- [Source code on GitHub](https://github.com/Rian-Fernando/HiveMind): full source, MIT-style open repository
- [Built by Rian Fernando](${PORTFOLIO_URL}): portfolio and other projects
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
