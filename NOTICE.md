# Third-party services & attribution

HiveMind is released under the MIT License (see `LICENSE`). It relies on the
following services and libraries at build time and runtime. HiveMind is an
independent project and is **not affiliated with, endorsed by, or connected to
any of them.**

| Layer | Service / library | Terms |
|---|---|---|
| Hosting & framework | [Next.js](https://nextjs.org) on [Vercel](https://vercel.com) | MIT · Vercel Hobby (free) |
| Database & realtime | [Supabase](https://supabase.com) (Postgres) | Apache-2.0 client · free tier |
| AI — primary | [Google Gemini API](https://ai.google.dev) | Google APIs Terms of Service · free tier |
| AI — fallback | [Groq](https://groq.com) (Llama 3.3 70B) | Groq Terms of Use · free tier |
| 3D rendering | [three.js](https://threejs.org), [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [drei](https://github.com/pmndrs/drei), [postprocessing](https://github.com/pmndrs/postprocessing) | MIT |
| Styling | [Tailwind CSS](https://tailwindcss.com) | MIT |
| QR codes | [qrcode.react](https://github.com/zpao/qrcode.react) | ISC — generated on-device, no service call |
| Confetti | [canvas-confetti](https://github.com/catdad/canvas-confetti) | ISC |
| Typefaces | Space Grotesk, Instrument Serif (Google Fonts) | SIL Open Font License 1.1 |

Brand assets in `public/brand/` and the HiveMind name and mark are © 2026 Rian
Fernando and are not covered by the MIT grant.

## Content and privacy

HiveMind stores the ideas participants submit in order to generate results, and
sends them to the AI provider named above to do so. Participants who mark a
pitch private are never identified in stored results — see
[`docs/privacy-model.md`](docs/privacy-model.md) for exactly what is kept, what
is sent, and what is masked.

Rooms are ephemeral working sessions, not a system of record. Do not put
confidential or personal information into a pitch.
