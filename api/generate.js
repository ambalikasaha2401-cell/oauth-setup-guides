// Serverless handler (Vercel) that is also used by server.js for local runs.
// Needs ANTHROPIC_API_KEY in the environment. No key is stored in this repo.
const { tooMany, readBody, extractJson, callClaude } = require("./_shared.js");

const cache = new Map(); // app -> { at, guide }
const LIMIT_PER_HOUR = 6;

const SCHEMA = `{
  "app": string, "website": string, "auth_type": string,
  "difficulty": "Easy" | "Moderate" | "Hard" | "Varies",
  "difficulty_reason": string,
  "time": { "headline": string, "best_case": string, "worst_case": string, "basis": string },
  "effort": string, "summary": string,
  "composio": { "status": "managed" | "own_app_required" | "unknown", "note": string, "source": string (URL, omit if unknown) },
  "before_you_start": string[],
  "steps": [{ "title": string, "detail": string, "who": "agent" | "you" | "either" }],
  "approval": { "required": boolean, "process": string, "what_can_block": string[], "if_blocked": string[] },
  "gotchas": string[],
  "agent_vs_you": { "agent_can": string[], "you_must": string[] },
  "claims": [{ "text": string, "status": "sourced" | "secondary" | "conflict" | "unverified", "source": string (URL, omit if unverified), "note": string (optional) }],
  "sources": [{ "title": string, "url": string }]
}`;

const SYSTEM = `You research how a developer sets up and gets approved for an OAuth app with a given provider, and you write a practical guide.

Rules:
- Use web search. Prefer the provider's official developer documentation. Read at least the official OAuth or app-registration page, the API reference for the token endpoints, and any app review, verification or distribution page.
- Every factual claim must come from a source you found. Put the important claims in "claims" with a status: "sourced" (official docs), "secondary" (blog, vendor, forum), "conflict" (sources disagree: say how in note), or "unverified" (you could not confirm).
- Never invent review times, fees, limits or steps. If the provider does not publish a timeline, say so in the time fields and mark it unverified.
- Before you write that something does not exist ("no refresh tokens", "no review", "no scopes"), look for it in the official API reference. Say "not found" only after you have checked there.
- "composio": check docs.composio.dev for whether Composio provides a managed OAuth app for this provider. Use "managed" only if a Composio page says so, "own_app_required" only if a Composio page says you must bring your own app, otherwise "unknown". Never guess.
- You have NOT performed the setup yourself. Do not say you tested anything. Time estimates that are your own must say "Estimate" in time.basis.
- "who" in each step is "agent" when an AI agent can do it (drafting, coding, checking), "you" when the developer must act (sign-in, submitting forms, payments, identity checks), or "either".
- Be concise. Steps should be concrete and ordered. Keep each string under 300 characters.
- If the product has no OAuth app registration (for example it only uses API keys), say so clearly in summary and set difficulty "Varies".
- Output ONLY one JSON object matching this shape, with no markdown fences and no commentary:
${SCHEMA}`;

function validate(g) {
  const need = ["app", "difficulty", "difficulty_reason", "time", "summary", "steps", "approval", "agent_vs_you", "claims", "sources"];
  for (const k of need) if (g[k] === undefined) throw new Error("Guide is missing: " + k);
  if (!["Easy", "Moderate", "Hard", "Varies"].includes(g.difficulty)) g.difficulty = "Varies";
  g.before_you_start = g.before_you_start || [];
  g.gotchas = g.gotchas || [];
  const c = g.composio;
  if (!c || !["managed", "own_app_required", "unknown"].includes(c.status)) g.composio = { status: "unknown", note: "Not checked." };
  return g;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "The live generator is not configured: ANTHROPIC_API_KEY is not set on the server." });

  const raw = String(readBody(req).app || "").trim().slice(0, 120);
  if (raw.length < 2) return res.status(400).json({ error: "Enter an app name or website." });

  const now = Date.now();
  const cacheKey = raw.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.at < 6 * 3600e3) return res.status(200).json({ guide: cached.guide, cached: true });
  if (tooMany(req, "generate", LIMIT_PER_HOUR)) return res.status(429).json({ error: "Too many lookups from this address. Try again in an hour." });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const text = await callClaude({
      key, system: SYSTEM, maxTokens: 6000, maxUses: 6,
      user: `App or website: ${raw}\nToday's date (UTC): ${today}\nWrite the OAuth app setup and approval guide for this app.`
    });
    const guide = validate(extractJson(text));
    guide.slug = "live-" + cacheKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    guide.last_checked = today + " (UTC)";
    guide.method = "Generated live by an agent that searched the web. No setup was attempted. Check the sources before relying on it.";
    guide.generated = true;
    cache.set(cacheKey, { at: now, guide });
    return res.status(200).json({ guide });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Generation failed." });
  }
};
module.exports.config = { maxDuration: 60 };
