import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import {
  PORTFOLIO_URL,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "group ideation",
    "hackathon idea generator",
    "team brainstorming tool",
    "anonymous brainstorming",
    "AI idea fusion",
    "hackathon team tools",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // og:image / twitter:image come from app/opengraph-image.png (file convention)
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  authors: [{ name: "Rian Fernando", url: PORTFOLIO_URL }],
  creator: "Rian Fernando",
};

export const viewport: Viewport = {
  themeColor: "#131110",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web browser",
  browserRequirements: "Requires JavaScript and a modern web browser",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Anonymous or credited idea submission, chosen per participant",
    "AI fusion combining one element from every pitch into four new ideas",
    "Optional pitch countdown that triggers generation automatically",
    "Live voting round with real-time tallies",
    "AI build plans with MVP scope, tech stack, and role split",
    "Presenter view for projectors",
    "Markdown export of results",
  ],
  softwareVersion: "1.2",
  codeRepository: REPO_URL,
  sameAs: [REPO_URL],
  author: {
    "@type": "Person",
    name: "Rian Fernando",
    url: PORTFOLIO_URL,
    sameAs: [PORTFOLIO_URL, "https://github.com/Rian-Fernando"],
  },
  publisher: {
    "@type": "Person",
    name: "Rian Fernando",
    url: PORTFOLIO_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Machine-readable summary for AI answer engines. Discoverable here
            in <head> rather than shown to readers as a link in the page. */}
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="llms.txt — summary for AI"
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${instrumentSerif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main"
          className="sr-only rounded-lg bg-honey px-4 py-2 font-semibold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
        <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-fog/70">
          <a
            href={PORTFOLIO_URL}
            rel="author"
            className="font-semibold text-fog transition hover:text-honey"
          >
            Built by Rian Fernando
          </a>
          <span className="mx-2">·</span>
          Next.js + Supabase + Gemini/Groq · runs entirely on free tiers
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
