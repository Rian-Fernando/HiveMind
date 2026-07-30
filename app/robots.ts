import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * AI answer engines and their crawlers. Explicitly allowed by name so
 * HiveMind can be read, summarised and cited by generative search —
 * several of these default to "no access" unless named.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — model training / knowledge
  "OAI-SearchBot", // OpenAI — ChatGPT Search index
  "ChatGPT-User", // OpenAI — live user-triggered fetch
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended",
  "CCBot", // Common Crawl — feeds many models
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
];

// Room pages are ephemeral private sessions; /api/ is machine-only.
const DISALLOW = ["/api/", "/room/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
