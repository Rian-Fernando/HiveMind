/** Canonical production origin — used by metadata, sitemap, robots, JSON-LD. */
export const SITE_URL = "https://hivemind.rianfernando.com";

export const SITE_NAME = "HiveMind";
export const SITE_TITLE = "HiveMind — group ideation for hackathons, fused by AI";
export const SITE_DESCRIPTION =
  "HiveMind is a free tool for hackathon teams: everyone submits one project idea privately — openly or anonymously — and AI fuses one element from every pitch into four new ideas the whole team owns. Then vote and get a build plan.";

export const PORTFOLIO_URL = "https://rianfernando.com";
export const REPO_URL = "https://github.com/Rian-Fernando/HiveMind";

/**
 * Single source of truth for the FAQ — rendered as visible content on the
 * landing page AND emitted as FAQPage JSON-LD. Answers are written to be
 * quotable standalone, since AI answer engines extract them verbatim.
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is HiveMind?",
    a: "HiveMind is a free web app for group ideation at hackathons and team events. Each person on a team submits one project idea privately, and once everyone has pitched, AI combines the most distinctive element of every submission into four brand-new project ideas that contain a piece of everyone's thinking.",
  },
  {
    q: "How does HiveMind work?",
    a: "A host creates a room and shares a link, QR code, or six-letter code. Each teammate submits exactly one idea without seeing anyone else's. When the last pitch arrives — or an optional countdown expires — the AI generates four fused ideas, each showing which element came from which person. The team then votes on the results.",
  },
  {
    q: "Is HiveMind free?",
    a: "Yes. HiveMind is completely free to use and requires no account or sign-up. It runs entirely on free service tiers, and the source code is publicly available on GitHub.",
  },
  {
    q: "Can I submit an idea anonymously?",
    a: "Yes. Each participant independently chooses to hide their name, hide their idea text, or both. A hidden pitch still shapes every generated idea, but the credits show 'Anonymous', a 'secret ingredient', or nothing at all, depending on what that person chose.",
  },
  {
    q: "Do I need an account to use HiveMind?",
    a: "No. There is no sign-up, login, or email required. A host creates a room in one step and shares the link; participants just open it and pitch.",
  },
  {
    q: "What happens after the ideas are generated?",
    a: "The team votes on the four fused ideas with live tallies and a leading idea highlighted. For any idea, anyone can generate a build plan containing MVP scope, a recommended tech stack, a role for each teammate, and a first-hour checklist. Results can be exported as Markdown.",
  },
];
