(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : "");
  const link = (u, t) => (safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t || u)}</a>` : esc(t || ""));
  const list = a => (a && a.length ? `<ul class="tight">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p class='fine'>None listed.</p>");
  const WHO = { agent: "Agent", you: "You", either: "Agent + you" };
  const STATUS = { sourced: "Sourced", secondary: "Secondary source", conflict: "Sources disagree", unverified: "Unverified", contradicted: "Contradicted by official docs" };
  const COMPOSIO = { managed: "Composio manages this app", own_app_required: "Bring your own app", unknown: "Not confirmed" };

  let library = [];
  let checked = "";

  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));

  function card(g) {
    return `<a class="card" href="#/guide/${esc(g.slug)}"><span class="badge ${esc(g.difficulty)}">${esc(g.difficulty)}</span><h3>${esc(g.app)}</h3><p>${esc(g.time.headline)}</p></a>`;
  }

  function guideHtml(g) {
    const approval = g.approval || {};
    return `
    <a class="back" href="#/">&larr; All guides</a>
    <h1>${esc(g.app)} <span class="badge ${esc(g.difficulty)}">${esc(g.difficulty)}</span></h1>
    <p class="lede">${esc(g.summary)}</p>
    <div class="banner"><b>How this was made:</b> ${esc(g.method || "")} Last checked ${esc(g.last_checked || "")}. ${g.generated ? "This guide was generated live, so read the sources before relying on it." : ""}</div>
    <div class="hero">
      <div class="grid">
        <div class="stat"><b>Difficulty</b>${esc(g.difficulty_reason)}</div>
        <div class="stat"><b>Time to expect</b>${esc(g.time.headline)}</div>
        <div class="stat"><b>Best case</b>${esc(g.time.best_case)}</div>
        <div class="stat"><b>Worst case</b>${esc(g.time.worst_case)}</div>
      </div>
      <p class="fine">Basis for time: ${esc(g.time.basis)}${g.effort ? " Effort: " + esc(g.effort) : ""}</p>
    </div>
    <div class="actions">
      <button type="button" id="copyLink">Copy share link</button>
      <button type="button" class="ghost" id="copyMd">Copy as Markdown</button>
      <button type="button" class="ghost" onclick="window.print()">Print or save as PDF</button>
    </div>
    ${g.composio ? `<div class="composio"><b>With Composio</b><span class="chip ${esc(g.composio.status)}">${esc(COMPOSIO[g.composio.status] || g.composio.status)}</span><p>${esc(g.composio.note || "")} ${g.composio.source ? link(g.composio.source, "Source") : ""}</p></div>` : g.composio_note ? `<p><b>Do you need your own app at all?</b> ${esc(g.composio_note)}</p>` : ""}
    <h2>Before you start</h2>${list(g.before_you_start)}
    <h2>Steps</h2>
    <ol class="steps">${(g.steps || []).map(s => `<li><b>${esc(s.title)}</b><span class="who ${esc(s.who)}">${esc(WHO[s.who] || s.who)}</span><div>${esc(s.detail)}</div></li>`).join("")}</ol>
    <h2>Approval: ${approval.required ? "required in some cases" : "not required to start"}</h2>
    <p>${esc(approval.process)}</p>
    <div class="two">
      <div class="panel"><h3>What can block you</h3>${list(approval.what_can_block)}</div>
      <div class="panel"><h3>If you are blocked</h3>${list(approval.if_blocked)}</div>
    </div>
    <h2>Gotchas</h2>${list(g.gotchas)}
    <h2>What an agent can do and where you take over</h2>
    <div class="two">
      <div class="panel"><h3>Agent can</h3>${list(g.agent_vs_you && g.agent_vs_you.agent_can)}</div>
      <div class="panel"><h3>You must</h3>${list(g.agent_vs_you && g.agent_vs_you.you_must)}</div>
    </div>
    <h2>What is confirmed and what is not</h2>
    <table><thead><tr><th>Claim</th><th>Status</th><th>Source / note</th></tr></thead><tbody>
    ${(g.claims || []).map(c => `<tr><td>${esc(c.text)}</td><td><span class="chip ${esc(c.status)}">${esc(STATUS[c.status] || c.status)}</span></td><td>${c.source ? link(c.source, "Source") : ""}${c.note ? `<div class="fine">${esc(c.note)}</div>` : ""}</td></tr>`).join("")}
    </tbody></table>
    <h2>Sources</h2>
    <ul class="tight">${(g.sources || []).map(s => `<li>${link(s.url, s.title || s.url)}</li>`).join("")}</ul>`;
  }

  function markdown(g) {
    const a = g.approval || {};
    const b = x => (x || []).map(i => "- " + i).join("\n");
    return `# ${g.app}: OAuth app setup (${g.difficulty})\n\n${g.summary}\n\n**Difficulty:** ${g.difficulty_reason}\n**Time:** ${g.time.headline}. Best: ${g.time.best_case}. Worst: ${g.time.worst_case}. (${g.time.basis})\n\n## Before you start\n${b(g.before_you_start)}\n\n## Steps\n${(g.steps || []).map((s, i) => `${i + 1}. **${s.title}** [${WHO[s.who] || s.who}]: ${s.detail}`).join("\n")}\n\n## Approval\n${a.process}\n\nCan block you:\n${b(a.what_can_block)}\n\nIf blocked:\n${b(a.if_blocked)}\n\n## Gotchas\n${b(g.gotchas)}\n\n## Agent can\n${b(g.agent_vs_you && g.agent_vs_you.agent_can)}\n\n## You must\n${b(g.agent_vs_you && g.agent_vs_you.you_must)}\n\n## Confidence\n${(g.claims || []).map(c => `- [${STATUS[c.status] || c.status}] ${c.text}${c.source ? " (" + c.source + ")" : ""}${c.note ? " Note: " + c.note : ""}`).join("\n")}\n\n## Sources\n${(g.sources || []).map(s => `- ${s.title}: ${s.url}`).join("\n")}\n\nLast checked ${g.last_checked}. ${g.method}\n`;
  }

  function show(g, hash) {
    $("home").hidden = true;
    const el = $("guide");
    el.hidden = false;
    el.innerHTML = guideHtml(g);
    window.scrollTo(0, 0);
    const flash = (id, done) => { const b = $(id); const t = b.textContent; b.textContent = done; setTimeout(() => (b.textContent = t), 1600); };
    $("copyLink").onclick = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname + (hash || location.hash)); flash("copyLink", "Copied"); } catch { prompt("Copy this link", location.href); } };
    $("copyMd").onclick = async () => { try { await navigator.clipboard.writeText(markdown(g)); flash("copyMd", "Copied"); } catch { prompt("Copy this text", markdown(g)); } };
    document.title = `${g.app}: OAuth setup guide`;
  }

  function route() {
    const h = location.hash;
    let m;
    if ((m = h.match(/^#\/guide\/([\w-]+)$/))) {
      const g = library.find(x => x.slug === m[1]);
      if (g) return show(g, h);
    } else if ((m = h.match(/^#\/g\/([\w-]+)$/))) {
      try { return show(dec(m[1]), h); } catch { /* fall through */ }
    }
    $("guide").hidden = true;
    $("home").hidden = false;
    document.title = "OAuth Setup Guides";
  }

  function match(q) {
    const s = q.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[^a-z0-9. ]/g, "").trim();
    if (s.length < 3) return null;
    const words = s.split(/[ .]+/);
    return library.find(g => {
      const host = (g.website || "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split(".")[0];
      const names = [g.slug, g.app.toLowerCase().split(/[ (]/)[0], host, ...(g.aliases || [])].filter(Boolean);
      return names.some(n => words.includes(n) || s === n);
    });
  }

  $("lookup").addEventListener("submit", async e => {
    e.preventDefault();
    const q = $("q").value.trim();
    const st = $("status");
    st.className = "status";
    const hit = match(q);
    if (hit) { location.hash = "#/guide/" + hit.slug; return; }
    $("go").disabled = true;
    st.textContent = "Not in the library. An agent is researching the provider's docs. This usually takes 30 to 60 seconds.";
    try {
      const r = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app: q }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      let guide = data.guide;
      st.textContent = "Guide drafted. Second pass: checking unconfirmed claims against the provider's official pages. About 30 seconds more.";
      try {
        const v = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app: guide.app, website: guide.website, claims: guide.claims }) });
        const vd = await v.json();
        if (!v.ok) throw new Error(vd.error || "Second pass failed.");
        guide = { ...guide, claims: vd.claims, method: guide.method + (vd.checked ? ` A second pass re-checked ${vd.checked} unconfirmed claim${vd.checked === 1 ? "" : "s"} against official pages.` : "") };
      } catch (verr) {
        guide = { ...guide, method: guide.method + " The second pass did not run (" + verr.message + "), so unconfirmed claims were not re-checked." };
      }
      st.textContent = "";
      location.hash = "#/g/" + enc(guide);
    } catch (err) {
      st.className = "status err";
      st.textContent = err.message;
    } finally {
      $("go").disabled = false;
    }
  });

  window.addEventListener("hashchange", route);
  fetch("guides.json").then(r => r.json()).then(d => {
    library = d.guides;
    checked = d.checked_on;
    $("cards").innerHTML = library.map(card).join("");
    $("checked").textContent = checked;
    route();
  });
})();
