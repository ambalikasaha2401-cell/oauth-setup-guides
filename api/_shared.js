// Helpers shared by the two serverless functions. The leading underscore keeps
// Vercel from exposing this file as its own endpoint.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const hits = new Map(); // "bucket:ip" -> [timestamps]

function tooMany(req, bucket, limit) {
  const ip = String((req.headers && req.headers["x-forwarded-for"]) || "local").split(",")[0].trim();
  const k = bucket + ":" + ip;
  const now = Date.now();
  const recent = (hits.get(k) || []).filter(t => now - t < 3600e3);
  if (recent.length >= limit) return true;
  hits.set(k, [...recent, now]);
  return false;
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  return body || {};
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The model did not return JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

// One Messages API call with web search. Returns the joined text blocks.
async function callClaude({ key, system, user, maxTokens, maxUses }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses }],
      messages: [{ role: "user", content: user }]
    })
  });
  const data = await r.json();
  if (!r.ok) {
    const err = new Error("Model request failed: " + ((data.error && data.error.message) || r.status));
    err.status = 502;
    throw err;
  }
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}

module.exports = { MODEL, tooMany, readBody, extractJson, callClaude };
