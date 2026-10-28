// Second pass. Takes the claims from a generated guide that are not firmly sourced
// (or that say something does not exist) and checks each against the provider's
// own documentation, including API reference pages. Needs ANTHROPIC_API_KEY.
const { tooMany, readBody, extractJson, callClaude } = require("./_shared.js");

const LIMIT_PER_HOUR = 12;
const MAX_CLAIMS = 6;

const SYSTEM = `You are a fact-checker for an OAuth setup guide about one provider. You receive numbered claims that were marked unconfirmed, secondary-sourced, disputed, or that say something does not exist.

For each claim, search the provider's OFFICIAL developer documentation, including API reference and endpoint pages, not only the getting-started guides. Only pages on the provider's own domains count as official.

Give one verdict per claim:
- "confirmed": an official page states it, and for this specific provider. Give that page's URL. A general statement about all providers or toolkits does not confirm a claim about one of them.
- "partly": the claim has several parts and an official page corrects at least one detail while the main point stands, or confirms some parts and contradicts others. Give that page's URL and say which part is wrong.
- "contradicted": an official page says the main point of the claim is wrong. Give that page's URL and say what it says.
- "not_found": you searched official pages and found no statement either way.

Never guess and never use a non-official page to confirm or contradict. Keep each note under 250 characters and do not quote more than a few words from a page.

Output ONLY this JSON, with no markdown fences and no commentary:
{"results":[{"i":number,"verdict":"confirmed"|"partly"|"contradicted"|"not_found","source":string,"note":string}]}`;

// Pick which claims are worth a second look.
function pick(claims) {
  const composio = /composio/i;
  const negative = /\b(no|not|never|without|doesn'?t|does not|isn'?t|cannot|can'?t)\b/i;
  const rank = c => (c.status === "conflict" ? 0 : c.status === "unverified" ? 1 : c.status === "secondary" ? 2 : negative.test(c.text) ? 3 : composio.test(c.text) ? 4 : 9);
  return claims
    .map((c, i) => ({ i, c, r: rank(c) }))
    .filter(x => x.r < 9)
    .sort((a, b) => a.r - b.r)
    .slice(0, MAX_CLAIMS);
}

// A source counts as official only if its host contains the provider's name.
function isOfficial(url, app, website) {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  const tokens = new Set();
  const name = String(app || "").toLowerCase().split(/[ (]/)[0].replace(/[^a-z0-9]/g, "");
  if (name.length >= 3) tokens.add(name);
  try {
    const w = new URL(/^https?:/i.test(website) ? website : "https://" + website).hostname.replace(/^www\./, "").split(".")[0];
    if (w.length >= 3) tokens.add(w.toLowerCase());
  } catch {}
  return [...tokens].some(t => host.includes(t));
}

function apply(claims, picked, results, app, website) {
  const out = claims.map(c => ({ ...c }));
  for (const x of picked) {
    const r = results.find(y => Number(y.i) === x.i);
    const c = out[x.i];
    if (!r) { c.note = ((c.note ? c.note + " " : "") + "Second pass did not return a result for this claim.").trim(); continue; }
    const official = isOfficial(r.source, app, website);
    const note = String(r.note || "").slice(0, 250);
    if (r.verdict === "confirmed" && official) {
      c.status = "sourced"; c.source = r.source;
      c.note = ("Confirmed in a second pass against an official page. " + note).trim();
    } else if (r.verdict === "partly" && official) {
      c.status = "partial"; c.source = r.source;
      c.note = ("Partly contradicted by an official page. " + note).trim();
    } else if (r.verdict === "contradicted" && official) {
      c.status = "contradicted"; c.source = r.source;
      c.note = ("Contradicted by an official page. " + note).trim();
    } else if (r.verdict === "not_found") {
      c.note = ((c.note ? c.note + " " : "") + "Second pass searched official pages and found no statement.").trim();
    } else {
      c.note = ((c.note ? c.note + " " : "") + "Second pass found a possible source that is not on the provider's own domain, so it was not used.").trim();
    }
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "The live generator is not configured: ANTHROPIC_API_KEY is not set on the server." });

  const body = readBody(req);
  const app = String(body.app || "").slice(0, 120);
  const website = String(body.website || "").slice(0, 200);
  const claims = Array.isArray(body.claims) ? body.claims.slice(0, 30).map(c => ({
    text: String(c.text || "").slice(0, 400),
    status: ["sourced", "secondary", "conflict", "unverified", "contradicted", "partial"].includes(c.status) ? c.status : "unverified",
    source: typeof c.source === "string" ? c.source.slice(0, 500) : undefined,
    note: typeof c.note === "string" ? c.note.slice(0, 400) : undefined
  })) : [];
  if (app.length < 2 || !claims.length) return res.status(400).json({ error: "Send the app and its claims." });

  const picked = pick(claims);
  if (!picked.length) return res.status(200).json({ claims, checked: 0 });
  if (tooMany(req, "verify", LIMIT_PER_HOUR)) return res.status(429).json({ error: "Too many checks from this address. Try again in an hour." });

  try {
    const list = picked.map(x => `${x.i}. ${x.c.text}`).join("\n");
    const text = await callClaude({
      key, system: SYSTEM, maxTokens: 2500, maxUses: 5,
      user: `Provider: ${app}${website ? " (" + website + ")" : ""}\nClaims to check:\n${list}`
    });
    const parsed = extractJson(text);
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    return res.status(200).json({ claims: apply(claims, picked, results, app, website), checked: picked.length });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Second pass failed." });
  }
};
module.exports.config = { maxDuration: 60 };
module.exports._internals = { pick, apply, isOfficial };
