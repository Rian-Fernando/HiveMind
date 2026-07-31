# Changelog

All notable changes to HiveMind are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-07-30

First tagged release. HiveMind is a group-ideation tool for hackathons: everyone
pitches one idea privately, AI fuses one element from every pitch into four new
ideas, and the team votes and gets a build plan.

### Rooms & pitching
- Host creates a room in one step — event name, group size (2–50), and an
  optional pitch countdown. No account, no sign-up, for anyone.
- Invites by shareable link, client-side QR code, or a readable six-letter code
  drawn from an alphabet with no ambiguous characters.
- One idea per person, submitted without seeing anyone else's first.
- Live pitch feed with 🔥💡😂 reactions, updating in real time as pitches land.
- Optional countdown (5–60 min) shown on every screen; fusion fires
  automatically at zero with whoever submitted, or the host can force it early.

### Privacy
- Two independent per-participant toggles: hide your name, hide your idea text,
  or both.
- Hidden pitches still shape every generated idea. Credits show the real name,
  "Anonymous", a "secret ingredient", or nothing at all, matching what that
  person chose.
- Enforced server-side: the `ideas` table has no browser read access, every read
  passes through a masking route, the AI receives placeholder labels instead of
  hidden participants' names, and results are masked before they are stored.

### AI
- Idea fusion that extracts the most distinctive element of each pitch — a
  mechanic, an audience, a technology, a constraint — and combines them into
  four hackathon-scoped concepts. One call per room, not per participant.
- Build plans generated on demand per idea: MVP features, a stack with
  reasoning, a role for each teammate, stretch goals and a first-hour checklist.
  Cached room-wide, so only the first click pays for it.
- Google Gemini primary with automatic Groq (Llama 3.3 70B) fallback, both on
  free tiers. Gemini uses constrained decoding so malformed JSON can't burn the
  primary provider.

### Results
- Live voting round: one changeable vote per device, real-time tallies, and the
  leading idea crowned as opinion moves.
- Build plans open in a modal, so opening one never reflows the results grid.
- Markdown export — copy or download — including votes and build plans.
- Confetti and a staggered reveal when results land.
- Presenter view at `/room/CODE/present` for projectors: a large QR code and a
  live submission counter, then oversized result cards with live tallies.

### Site
- Scroll-driven 3D landing page (three.js / React Three Fiber) staging the
  product story in four acts — scattered motes, the honeycomb forming, fusion
  igniting, four ideas crystallizing — with bloom, fog and pointer parallax.
- Guided demo at `/demo`: an eight-step walkthrough of a full session on sample
  data, covering all four privacy combinations. No database writes, no AI calls.
- Brand identity applied throughout: hex-spark mark, honey-on-ink palette,
  favicons, PWA manifest.

### Discoverability
- `sitemap.xml`, `robots.txt`, canonical URLs, and a permanent redirect from the
  raw `*.vercel.app` host so nothing is indexed twice.
- `/llms.txt` following the llms.txt convention, advertised in `<head>`.
- Fourteen AI crawlers allowed by name, so answer engines can read and cite the
  app rather than skipping it.
- `SoftwareApplication`, `FAQPage` and `HowTo` structured data.

### Engineering
- All writes flow through Next.js API routes using the Supabase service-role
  key; the browser's anon key can only read the `rooms` table.
- Host identity is a one-time key held only in the host's browser and stored
  only as a SHA-256 hash.
- Race-safe generation: a conditional `open → generating` status update
  guarantees exactly one AI run when every client notices a full room at once,
  and a stale claim expires after two minutes.
- 3D is loaded dynamically, gated on a WebGL capability check, reduced on
  low-power devices, paused when the tab is hidden, and frozen to a still frame
  under `prefers-reduced-motion`.
- CI on every push: typecheck, production build, and a check that the public
  discovery routes were generated.

[1.0.0]: https://github.com/Rian-Fernando/HiveMind/releases/tag/v1.0.0
