import { DeepDive, FusedIdea } from "./types";

/**
 * AI generation — primary: Google Gemini (free tier), fallback: Groq (free tier).
 * Both are called over plain REST so there are no SDK dependencies.
 * If a model is ever retired, update the constants below.
 */
// "latest" alias tracks Google's newest stable Flash model, so the app
// keeps working when older model versions are retired.
const GEMINI_MODEL = "gemini-flash-latest";
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

// ── provider plumbing ────────────────────────────────────────────────

function extractJson<T>(raw: string): T {
  // Models occasionally wrap JSON in ```json fences despite instructions.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

/** Gemini with constrained decoding — responseSchema guarantees valid JSON. */
async function callGemini<T>(prompt: string, responseSchema: object): Promise<T> {
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
          maxOutputTokens: 16384,
          responseSchema,
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
  return extractJson<T>(text);
}

async function callGroq<T>(prompt: string): Promise<T> {
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
  return extractJson<T>(text);
}

/** Try Gemini first; fall back to Groq. Throws only if both fail. */
async function withFallback<T>(
  prompt: string,
  responseSchema: object,
  validate: (parsed: T) => void
): Promise<{ provider: "gemini" | "groq"; data: T }> {
  try {
    const data = await callGemini<T>(prompt, responseSchema);
    validate(data);
    return { provider: "gemini", data };
  } catch (geminiErr) {
    console.warn("Gemini failed, falling back to Groq:", geminiErr);
    try {
      const data = await callGroq<T>(prompt);
      validate(data);
      return { provider: "groq", data };
    } catch (groqErr) {
      console.error("Groq also failed:", groqErr);
      throw new Error(
        "Both AI providers failed. Check API keys / rate limits and try again."
      );
    }
  }
}

// ── idea fusion ──────────────────────────────────────────────────────

const FUSION_SCHEMA = {
  type: "OBJECT",
  properties: {
    ideas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          tagline: { type: "STRING" },
          description: { type: "STRING" },
          elements: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                author: { type: "STRING" },
                element: { type: "STRING" },
              },
              required: ["author", "element"],
            },
          },
        },
        required: ["title", "tagline", "description", "elements"],
      },
    },
  },
  required: ["ideas"],
};

function buildFusionPrompt(
  eventName: string,
  submissions: LabeledSubmission[]
): string {
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

export async function generateFusedIdeas(
  eventName: string,
  submissions: LabeledSubmission[]
): Promise<{ provider: "gemini" | "groq"; ideas: FusedIdea[] }> {
  const prompt = buildFusionPrompt(eventName, submissions);
  const { provider, data } = await withFallback<{ ideas: FusedIdea[] }>(
    prompt,
    FUSION_SCHEMA,
    (parsed) => {
      if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
        throw new Error("AI response missing 'ideas' array");
      }
    }
  );
  return { provider, ideas: data.ideas };
}

// ── deep dive (build plan for one fused idea) ────────────────────────

const DEEP_DIVE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overview: { type: "STRING" },
    mvp_features: { type: "ARRAY", items: { type: "STRING" } },
    tech_stack: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          layer: { type: "STRING" },
          choice: { type: "STRING" },
          why: { type: "STRING" },
        },
        required: ["layer", "choice", "why"],
      },
    },
    roles: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          member: { type: "STRING" },
          focus: { type: "STRING" },
        },
        required: ["member", "focus"],
      },
    },
    stretch_goals: { type: "ARRAY", items: { type: "STRING" } },
    first_hour: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "overview",
    "mvp_features",
    "tech_stack",
    "roles",
    "stretch_goals",
    "first_hour",
  ],
};

function buildDeepDivePrompt(
  eventName: string,
  idea: FusedIdea,
  teamLabels: string[]
): string {
  return `You are HiveMind's build strategist. A hackathon team at "${eventName}" just picked this fused project idea and wants a concrete plan they can start executing immediately.

Project: ${idea.title}
Hook: ${idea.tagline}
Description: ${idea.description}

Team members (use these labels EXACTLY in the roles): ${teamLabels.join(", ")}

Produce a hackathon-realistic build plan. Be specific and opinionated — name real technologies, keep the MVP achievable in 24-36 hours, and split roles so every member has a clear focus matched to a distinct part of the build.

Respond with ONLY valid JSON matching exactly this schema (no markdown):
{
  "overview": "2-3 sentences framing the build strategy",
  "mvp_features": ["4-6 concrete features that ARE the demo"],
  "tech_stack": [{ "layer": "e.g. Frontend", "choice": "specific tech", "why": "one short reason" }],
  "roles": [{ "member": "team member label", "focus": "their workstream" }],
  "stretch_goals": ["2-3 things to add only if time allows"],
  "first_hour": ["3-4 very concrete first steps, in order"]
}
"roles" must contain exactly one entry per team member (${teamLabels.length} entries).`;
}

export async function generateDeepDive(
  eventName: string,
  idea: FusedIdea,
  teamLabels: string[]
): Promise<{ provider: "gemini" | "groq"; deepDive: DeepDive }> {
  const prompt = buildDeepDivePrompt(eventName, idea, teamLabels);
  const { provider, data } = await withFallback<DeepDive>(
    prompt,
    DEEP_DIVE_SCHEMA,
    (parsed) => {
      if (!parsed.overview || !Array.isArray(parsed.mvp_features)) {
        throw new Error("AI response missing deep-dive fields");
      }
    }
  );
  return { provider, deepDive: data };
}
