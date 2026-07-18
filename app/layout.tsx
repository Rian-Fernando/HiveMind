import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import {
  PORTFOLIO_URL,
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
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  author: {
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
      <body className={`${spaceGrotesk.variable} ${instrumentSerif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
