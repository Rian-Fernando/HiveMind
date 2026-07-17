# HiveMind 🐝

**Group ideation for hackathons — everyone pitches (openly or anonymously), and AI fuses one element from each pitch into brand-new project ideas the whole hive owns.**

A host creates a room, shares a link or QR code, and each teammate submits their own idea. Everyone chooses their own privacy level: pitch openly, hide your name, hide your idea text, or go fully incognito. The moment the last person submits, AI extracts the most distinctive element from every pitch and generates 4 fused project concepts — crediting only the people who opted in.

Live demo: _(add your Vercel URL here)_ · Built by [Rian Fernando](https://rianfernando.com)

---

## How it works

```
Host creates room ──► gets link + QR + 6-letter code
        │
        ▼
Teammates open link ──► each pitches + picks privacy:
        │                 name shown/hidden · idea shown/hidden
        ▼  (live pitch feed via Supabase Realtime)
        │
Last idea lands ──► AI auto-triggers (host can also force early)
        │
        ▼
Gemini (primary) ──fails?──► Groq (fallback)
        │
        ▼
4 fused ideas, credited per each person's privacy choice
```

## The privacy model

Each participant gets two independent toggles at submission time:

| Hide name | Hide idea | In the room (live feed) | In the results |
|:---:|:---:|---|---|
| — | — | "Maya — food-waste map…" | **Maya · real-time maps** |
| ✅ | — | "Anonymous — food-waste map…" | **Anonymous · real-time maps** |
| — | ✅ | "Maya — 🔒 pitch kept private" | **Maya · secret ingredient 🤫** |
| ✅ | ✅ | "Anonymous — 🔒 pitch kept private" | *(no credit at all — the idea still silently shapes every concept)* |

Privacy is enforced **server-side**, not just visually: the `ideas` table has no
read access from the browser. Every read flows through `/api/progress`, which
masks per-row flags, the AI never receives a hidden participant's real name
(it sees `Anonymous #2`), and results are masked *before* being stored in the
browser-readable `rooms` table.

## Stack — 100% free tiers

| Layer | Service | Free tier |
|---|---|---|
| Frontend + API | [Next.js 15](https://nextjs.org) on [Vercel](https://vercel.com) | Hobby plan, free forever |
| Database + Realtime | [Supabase](https://supabase.com) | 500 MB Postgres, Realtime included |
| AI (primary) | [Google Gemini](https://aistudio.google.com) | Free API tier, no credit card |
| AI (fallback) | [Groq](https://console.groq.com) (Llama 3.3 70B) | Free API tier, no credit card |
| QR codes | `qrcode.react` | Generated client-side, no service |

If Gemini rate-limits during a busy event, the API route automatically retries the same prompt on Groq — participants never notice.

---

## Setup (~10 minutes)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret — server only)

### 2. AI keys (both free, no credit card)

- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key
- **Groq**: [console.groq.com/keys](https://console.groq.com/keys) → Create API key

### 3. Environment

```bash
cp .env.example .env.local
# fill in the 5 values
```

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, create a room, then open the room link in a second browser (or incognito window) to simulate a teammate.

---

## Deploy to Vercel (free)

1. Push to GitHub (this repo: [Rian-Fernando/HiveMind](https://github.com/Rian-Fernando/HiveMind))
2. [vercel.com/new](https://vercel.com/new) → import the repo (defaults are fine)
3. Add the 5 environment variables from `.env.local` in **Project → Settings → Environment Variables**
4. Deploy — your shareable room links and QR codes now work on any phone

---

## Architecture notes

- **All writes go through API routes** using the Supabase service-role key. The browser's anon key can only read the `rooms` table (which contains nothing sensitive) — the `ideas` table is fully private to the server.
- **Host authentication** — room creation returns a one-time host key stored only in the host's browser; the database stores just its SHA-256 hash, so even full read access to the DB can't impersonate a host.
- **Race-safe generation** — when the room fills, every connected client fires the generate call, but a conditional `status: open → generating` update in Postgres guarantees exactly one AI run. A stale `generating` claim (crashed function) auto-expires after 2 minutes.
- **Live updates without leaking** — clients subscribe to Realtime on the `rooms` row only; every submission bumps `rooms.updated_at`, signalling clients to refetch the masked progress view. A 5-second polling fallback covers flaky connections.
- **Models** are plain-REST calls (no SDKs): `gemini-2.5-flash` and `llama-3.3-70b-versatile`, both set as constants at the top of [`lib/ai.ts`](lib/ai.ts) if they ever need updating.

## Project structure

```
app/
  page.tsx                 landing — create or join a room
  room/[code]/page.tsx     the room: pitch + privacy toggles, live feed,
                           host panel, results
  api/rooms/route.ts       POST — create room (code + hashed host key)
  api/ideas/route.ts       POST — submit an idea (validation + privacy flags)
  api/progress/route.ts    GET  — privacy-masked view of who has pitched what
  api/generate/route.ts    POST — race-safe AI fusion, Gemini → Groq,
                           results masked before storage
lib/
  ai.ts                    prompt building + both providers + fallback
  supabaseBrowser.ts       anon client (reads rooms only)
  supabaseAdmin.ts         service-role client (API routes only)
supabase/
  schema.sql               tables, RLS, realtime — run once in Supabase
```

## Free-tier limits worth knowing

- **Gemini free tier** allows a limited number of requests/day — plenty for events, since HiveMind makes exactly **one** AI call per room (not per participant).
- **Supabase free projects pause after 7 days of inactivity** — just hit "Restore" in the dashboard before an event, or open the app once a week.
- **Vercel Hobby** functions run up to 60s — generation typically takes 3–10s.
