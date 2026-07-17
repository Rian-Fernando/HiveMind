import { FusedIdea } from "./types";

/**
 * AI idea fusion — primary: Google Gemini (free tier), fallback: Groq (free tier).
 * Both are called over plain REST so there are no SDK dependencies.
 * If a model is ever retired, update the constants below.
 */
const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * `label` is already privacy-masked by the caller: real name for public
 * participants, "Anonymous #k" for name-hidden ones. The model never
 * sees a hidden participant's real name.
 */
export interface LabeledSubmission {
  label: string;
  idea: string;
}

function buildPrompt(eventName: string, submissions: LabeledSubmission[]): string {
  const pitches = submissions
    .map((s, i) => `${i + 1}. ${s.label}: "${s.idea.trim()}"`)
    .join("\n");

  return `You are the creative engine of HiveMind, a group-ideation tool used at hackathons and student events.

Event: "${eventName}"

Each member of a team pitched their own project idea separately:

${pitches}

Your job:
1. For EACH person, identify the single most distinctive, interesting element of their pitch (a mechanic, audience, technology, constraint, or theme — not a generic word like "app").
2. Invent exactly 4 NEW project ideas. Every new idea MUST meaningfully combine at least one element from EVERY person listed above — the point is that the whole group sees their fingerprint in each result.
3. Keep each idea buildable by a small team during a hackathon: concrete, scoped, and exciting. Avoid vague buzzwords.

Respond with ONLY valid JSON matching exactly this schema (no markdown, no commentary):
{
  "ideas": [
    {
      "title": "short punchy name",
      "tagline": "one-sentence hook",
      "description": "2-4 sentences: what it is, how it works, why it's cool",
      "elements": [
        { "author": "the pitcher's label EXACTLY as written above (including labels like 'Anonymous #2')", "element": "the element of theirs you used" }
      ]
    }
  ]
}
The "elements" array of every idea must contain one entry per participant (${submissions.length} entries), using each label exactly once.`;
}

function extractJson(raw: string): { ideas: FusedIdea[] } {
  // Models occasionally wrap JSON in ```json fences despite instructions.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    throw new Error("AI response missing 'ideas' array");
  }
  return parsed;
}

async function generateWithGemini(prompt: string): Promise<FusedIdea[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.9,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return extractJson(text).ideas;
}

async function generateWithGroq(prompt: string): Promise<FusedIdea[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return extractJson(text).ideas;
}

/**
 * Try Gemini first; if it fails for any reason (rate limit, outage,
 * missing key), fall back to Groq. Throws only if both fail.
 */
export async function generateFusedIdeas(
  eventName: string,
  submissions: LabeledSubmission[]
): Promise<{ provider: "gemini" | "groq"; ideas: FusedIdea[] }> {
  const prompt = buildPrompt(eventName, submissions);

  try {
    return { provider: "gemini", ideas: await generateWithGemini(prompt) };
  } catch (geminiErr) {
    console.warn("Gemini failed, falling back to Groq:", geminiErr);
    try {
      return { provider: "groq", ideas: await generateWithGroq(prompt) };
    } catch (groqErr) {
      console.error("Groq also failed:", groqErr);
      throw new Error(
        "Both AI providers failed. Check API keys / rate limits and try again."
      );
    }
  }
}
