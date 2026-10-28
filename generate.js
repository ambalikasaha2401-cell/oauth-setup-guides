// Serverless handler (Vercel) that is also used by server.js for local runs.
// Needs ANTHROPIC_API_KEY in the environment. No key is stored in this repo.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const cache = new Map();            // app -> { at, guide }
const hits = new Map();             // ip -> [timestamps]
const LIMIT_PER_HOUR = 6;

const SCHEMA = `{
  "app": string, "website": string, "auth_type": string,
  "difficulty": "Easy" | "Moderate" | "Hard" | "Varies",
  "difficulty_reason": string,
  "time": { "headline": string, "best_case": string, "worst_case": string, "basis": string },
  "effort": string, "summary": string, "composio_note": string,
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
- Use web search. Prefer the provider's official developer documentation. Read at least the official OAuth or app-registration page and any app review, verification or distribution page.
- Every factual claim must come from a source you found. Put the important claims in "claims" with a status: "sourced" (official docs), "secondary" (blog, vendor, forum), "conflict" (sources disagree: say how in note), or "unverified" (you could not confirm).
- Never invent review times, fees, limits or steps. If the provider does not publish a timeline, say so in the time fields and mark it unverified.
- You have NOT performed the setup yourself. Do not say you tested anything. Time estimates that are your own must say "Estimate" in time.basis.
- "who" in each step is "agent" when an AI agent can do it (drafting, coding, checking), "you" when the developer must act (sign-in, submitting forms, payments, identity checks), or "either".
- Be concise. Steps should be concrete and ordered. Keep each string under 300 characters.
- If the product has no OAuth app registration (for example it only uses API keys), say so clearly in summary and set difficulty "Varies".
- Output ONLY one JSON object matching this shape, with no markdown fences and no commentary:
${SCHEMA}`;

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The model did not return a guide.");
  return JSON.parse(text.slice(start, end + 1));
}

function validate(g) {
  const need = ["app", "difficulty", "difficulty_reason", "time", "summary", "steps", "approval", "agent_vs_you", "claims", "sources"];
  for (const k of need) if (g[k] === undefined) throw new Error("Guide is missing: " + k);
  if (!["Easy", "Moderate", "Hard", "Varies"].includes(g.difficulty)) g.difficulty = "Varies";
  g.before_you_start = g.before_you_start || [];
  g.gotchas = g.gotchas || [];
  return g;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "The live generator is not configured: ANTHROPIC_API_KEY is not set on the server." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const raw = String((body && body.app) || "").trim().slice(0, 120);
  if (raw.length < 2) return res.status(400).json({ error: "Enter an app name or website." });

  const ip = (req.headers["x-forwarded-for"] || "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  const cacheKey = raw.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.at < 6 * 3600e3) return res.status(200).json({ guide: cached.guide, cached: true });
  if (recent.length >= LIMIT_PER_HOUR) return res.status(429).json({ error: "Too many lookups from this address. Try again in an hour." });
  hits.set(ip, [...recent, now]);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,
        system: SYSTEM,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: `App or website: ${raw}\nToday's date: ${new Date().toISOString().slice(0, 10)}\nWrite the OAuth app setup and approval guide for this app.` }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: "Model request failed: " + ((data.error && data.error.message) || r.status) });
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const guide = validate(extractJson(text));
    guide.slug = "live-" + cacheKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    guide.last_checked = new Date().toISOString().slice(0, 10);
    guide.method = "Generated live by an agent that searched the web. No setup was attempted. Check the sources before relying on it.";
    guide.generated = true;
    cache.set(cacheKey, { at: now, guide });
    return res.status(200).json({ guide });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Generation failed." });
  }
};
module.exports.config = { maxDuration: 60 };
