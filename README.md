# OAuth Setup Guides

Guides that tell a developer how hard it is to set up and get approved for a provider's OAuth app, how long to expect, what can block them, and what an agent can do versus what they must do. If an app is not in the library, an agent researches it live and generates a shareable guide.

**Live demo:** https://oauth-setup-guides-rouge.vercel.app

## The problem this addresses

A developer building an AI agent needs their users to connect an app. Before launch they may need their own OAuth app registered with the provider, and sometimes approved. The effort ranges from a 15-minute form to weeks of review plus a paid security assessment, and the docs rarely say which. Composio's docs say managed OAuth is the default where it exists, and list reasons to bring your own app: your own consent-screen name, custom scopes, dedicated rate limits, faster polling, custom instances, enterprise branding, and toolkits with no managed app. So this tool focuses on the moment a developer needs their own app, and tells them for each provider whether Composio manages it.

## What it does

- **Library:** four guides for apps chosen to differ on approval friction: GitHub (Easy), Slack (Moderate), Google with Gmail scopes (Hard), LinkedIn (Varies).
- **Live generation:** type any app name or website. An agent searches the web, reads the provider's docs and returns a guide in the same shape, with a status on every claim.
- **Second pass:** after the draft, a separate call re-checks the claims that are not firmly sourced, and the claims that say something does not exist, against the provider's own documentation including API reference pages. A claim is upgraded to Sourced only if the confirming page is on the provider's own domain, and shown as **Contradicted by official docs** if an official page says otherwise.
- **With Composio:** each guide says whether Composio manages the provider's OAuth app, whether you must bring your own, or that it could not be confirmed, with a source.
- **Shareable:** copy a link (generated guides are encoded in the link, so no database is needed), copy as Markdown, or print to PDF.

Every guide answers the same questions in the same order: difficulty and why, time (best and worst case, and the basis), what to prepare, numbered steps tagged **Agent**, **You** or **Agent + you**, what approval involves, what can block you and what to do then, gotchas, and a table of claims with their evidence.

## Run it locally

Requires Node 18 or newer. No packages to install.

```
git clone <this repo>
cd oauth-setup-guides
cp .env.example .env        # then put your own ANTHROPIC_API_KEY in .env
node server.js
```

Open http://localhost:3000. The library works without a key. Live generation needs the key.

## Deploy (Vercel)

Import the repository in Vercel, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) under Environment Variables, and deploy. `vercel.json` sets a 60-second limit for each of the two functions (`api/generate.js` and `api/verify.js`). No credentials are in this repository.

## What I tested, what I sourced, what is unverified

I read the official documentation for each library app on 2026-10-29, and re-checked the library against official pages again the same day (see the correction below). **I did not complete a real OAuth app setup for any provider**, so no claim here is "tested hands-on". Each claim in each guide carries one of four statuses: Sourced (official docs), Secondary (blog or vendor), Sources disagree, Unverified.

Sample of claims I checked against the sources, and what I found:

| Claim | Result | Source |
|---|---|---|
| GitHub: form needs name, homepage and callback URL; up to 10 callback URLs | Confirmed | GitHub Docs, creating an OAuth app |
| GitHub: no review or approval step for OAuth apps | Confirmed by absence only. The page does not mention one. | same |
| GitHub: a user or org can own up to 100 OAuth apps | Confirmed | same |
| GitHub: OAuth app tokens share 5,000 requests per hour | Confirmed | GitHub Docs, differences between GitHub Apps and OAuth apps |
| GitHub: where the client secret is generated | Could not verify. The page does not cover it. Marked unverified. | n/a |
| Slack: redirect_uri must be HTTPS and match a configured URL | Confirmed | Slack docs, installing with OAuth |
| Slack: temporary code expires in ten minutes | Confirmed | same |
| Slack: public distribution needs OAuth 2.0, SSL and a completed checklist | Confirmed | Slack docs, distribution |
| Slack: Marketplace review timeline | **Corrected.** The first version said Slack publishes no timeline. That was wrong. The distribution page is silent, but Slack's Marketplace review guide states up to 10 business days to first feedback and up to 10 weeks of functional review for new apps (6 weeks for resubmitted published apps). The guide now says this and cites that page. | Slack docs, Marketplace review guide |
| Slack: rate-limit differences, listed vs unlisted | Could not verify. The page is silent. Marked unverified. | n/a |
| Google: sensitive scope review time | **Corrected / flagged.** Two official Google pages disagree: 3 to 5 business days vs 10 business days. The guide shows both and tells the reader to plan for the longer one. | Google for Developers; Google Cloud Help FAQ |
| Google: restricted scopes need an annual security assessment | Confirmed | Google Cloud Help FAQ |
| Google: unverified apps capped at 100 new users, lifetime | Confirmed | Google Cloud Help FAQ |
| Google: security assessment costs $15,000 to $75,000 | **Downgraded.** It comes from a dated vendor blog, and Google's FAQ says prices are set by independent assessors. Marked Secondary. | Nylas blog; Google FAQ |
| Google: the vendor blog's requirements list | **Corrected.** The blog omits the homepage and privacy-policy requirement that Google's own page states, so I used Google's page. | Google for Developers |
| LinkedIn: only a few permissions are open to all developers | Confirmed | Microsoft Learn, getting access |
| LinkedIn: review timeline for gated products | Confirmed. Microsoft Learn says restricted APIs are "evaluated on a case-by-case basis with no fixed timeline". | Microsoft Learn, increasing access |
| LinkedIn: whether app creation needs a company Page | Could not verify from the page read. Marked unverified. | n/a |

### Claim check on live-generated guides

I also compared claims in two live-generated guides with the provider's official pages. Generated guides are not hand-verified, so read the sources they cite before relying on them.

**Notion** (read Notion's public connections, authorization and API reference pages, 29 Oct 2026; 10 claims)

- 5 matched: creation steps, installation scope options and that scope can't be changed, authorization URL location, token endpoint with Basic auth, and when redirect_uri is required.
- 1 partly matched: "Notion has no OAuth scopes". Notion's docs use "capabilities" selected at creation, which the guide leaves out.
- 1 not confirmed: "client secret may be shown only once". Notion's official page doesn't state it. Only an older secondary tutorial does, and the guide labelled it Secondary source with an age warning.
- 1 contradicted by an official page: "Notion has no refresh tokens and the access token doesn't expire". Notion's API reference documents a Refresh a token endpoint and returns a refresh_token. The guide marked this "Sources disagree" but said it found no official statement, which was wrong. This is a real miss by the first version of the live generator, and the reason the second pass exists.
- 2 consistent with silence: no published review timeline or fee, and the owner-role requirement. The guide marked both Unverified.

**Zoom** (read Zoom's app review, create-an-app and sharing pages, 29 Oct 2026; 6 claims)

- 4 matched: private and beta apps need no review; public and unlisted apps go through functionality, usability and security review; Zoom publishes no fixed total review time; beta apps shared outside your account need Zoom's approval ("Request to Share", which Zoom says takes about 3-4 business days and needs security documentation).
- 2 partly matched, both labelled secondary by the guide: a 72-hour SLA (a Zoom forum reply says "72-hour SLA for every submission", as a response time, not "per review round") and a security review of about 2 weeks (the forum says "up to 2 weeks, depending on the accuracy of the Technical Design Documents", so "about" overstates it). Zoom's own pages give neither number, and the forum page does not state the author's affiliation.

The confidence labels were mostly right: the unsupported claims were marked Unverified or Secondary source. The refresh-token claim was the exception. I checked the docs only. I did not create a Notion or Zoom app.

### The second pass (added after the Notion miss)

`api/verify.js` receives the claims from a generated guide and picks up to six that are conflicted, unverified, secondary, or that say something does not exist. It asks the model to search the provider's official documentation, including API reference pages, and return one verdict per claim: confirmed, contradicted, or not found. The server only accepts a source as official if its host contains the provider's name. The generator prompt also now tells the first pass to check the API reference before writing that something does not exist.

Tested with mocked responses (claim selection, rejection of non-official sources, partly/contradicted/not-found handling, input validation, the hourly limit) and then once against the real model on Notion on 29 Oct 2026. The real run showed the second pass working: it re-checked 6 claims, and several now carry "Confirmed in a second pass against an official page". It also showed two flaws, which I fixed afterwards and have not re-run on the real model:

- A claim that was only partly wrong (a redirect URI rule list) was shown as "Contradicted by official docs". I added a "partly" verdict and a "Partly contradicted" label.
- A generic Composio statement ("most toolkits use managed auth") had been accepted as a sourced claim about Notion. The second pass now also checks Composio claims, a confirmation must name the specific provider, and the "With Composio" box falls back to "Not confirmed" unless it cites a Composio page that names the provider.

## Key decisions

- **Four apps chosen for variety in approval friction**, not popularity. A developer learns the most from seeing "no review", "review with no published timeline", "weeks plus an annual assessment" and "depends on the permission" side by side.
- **A fixed guide shape.** Guides are scannable and comparable, and the live agent is told to fill the same structure, so generated guides look like library guides.
- **Confidence on every claim.** Guidance developers will act on is worse than none if it sounds certain and is wrong. Missing information is reported as a finding ("LinkedIn gives no fixed timeline for gated products"), but only after the official API reference has been checked. My own first Slack guide made exactly that mistake and was corrected.
- **Time is a range with a reason**, and says whether it is from the docs or my estimate.
- **The agent/you split is part of the guide.** It shows where an agent saves time (drafting justifications, scoping, writing the OAuth flow, checking pages) and where a human must act (sign-in, submitting forms, identity checks, paying an assessor).
- **No database.** Generated guides are encoded in the share link, which keeps the project deployable with no extra services. The trade-off is long links.
- **Two calls instead of one long call.** The draft and the fact-check run as separate requests, so each stays inside the 60-second function limit and the guide is not blocked on the check.
- **Composio relevance on every guide.** The question a Composio developer asks first is whether they need their own app at all, so each guide answers it, with "not confirmed" when no Composio page says.
- **Guard rails on the generator:** input length limit, a per-address hourly limit and a six-hour cache, so one key cannot be drained by repeated lookups.

## Limitations

- No real setup or approval was attempted for any provider, and no paid accounts were used. Approval times come from provider documentation and are labelled.
- The first pass has been run against a real model on two apps (Notion, Zoom). The second pass has only been tested with mocked responses. The generator can produce wrong or incomplete guides for poorly documented apps, and it cannot see content behind logins.
- Live guides can say "I found no official statement" when one exists. Treat "Sources disagree" and "Unverified" claims as prompts to open the official page yourself.
- The Composio managed-auth status in the library comes from Composio's docs, which name GitHub, Gmail and Slack as managed examples and give no full list. LinkedIn is marked not confirmed. Zoom's own Composio guide says to create your own Zoom app.
- Provider policies change. Guides show the date they were checked, and the library should be re-checked regularly.
- Share links for generated guides are long, and in-memory caching and rate limits reset when the server restarts.
- Only four library guides, not 100.
- The "Last checked" date on a generated guide is the UTC date.
