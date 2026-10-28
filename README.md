# OAuth Setup Guides

Guides that tell a developer how hard it is to set up and get approved for a provider's OAuth app, how long to expect, what can block them, and what an agent can do versus what they must do. If an app is not in the library, an agent researches it live and generates a shareable guide.

**Live demo:** _https://oauth-setup-guides-rouge.vercel.app

## The problem this addresses

A developer building an AI agent needs their users to connect an app. Before launch they may need their own OAuth app registered with the provider, and sometimes approved. The effort ranges from a 15-minute form to weeks of review plus a paid security assessment, and the docs rarely say which. Composio's managed OAuth removes this for supported apps, so this tool focuses on the moment a developer needs their own app: for their own consent-screen name, custom scopes, a separate rate-limit quota, or an app Composio does not manage.

## What it does

- **Library:** four guides for apps chosen to differ on approval friction: GitHub (Easy), Slack (Moderate), Google with Gmail scopes (Hard), LinkedIn (Varies).
- **Live generation:** type any app name or website. An agent searches the web, reads the provider's docs and returns a guide in the same shape, with a status on every claim.
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

Import the repository in Vercel, add `ANTHROPIC_API_KEY` under Environment Variables, and deploy. `vercel.json` sets a 60-second limit for the generator. No credentials are in this repository.

## What I tested, what I sourced, what is unverified

I read the official documentation for each library app on 2026-10-29. **I did not complete a real OAuth app setup for any provider**, so no claim here is "tested hands-on". Each claim in each guide carries one of four statuses: Sourced (official docs), Secondary (blog or vendor), Sources disagree, Unverified.

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
| Slack: Marketplace review timeline | **Not published.** The guide says so instead of estimating. | same |
| Slack: rate-limit differences, listed vs unlisted | Could not verify. The page is silent. Marked unverified. | n/a |
| Google: sensitive scope review time | **Corrected / flagged.** Two official Google pages disagree: 3 to 5 business days vs 10 business days. The guide shows both and tells the reader to plan for the longer one. | Google for Developers; Google Cloud Help FAQ |
| Google: restricted scopes need an annual security assessment | Confirmed | Google Cloud Help FAQ |
| Google: unverified apps capped at 100 new users, lifetime | Confirmed | Google Cloud Help FAQ |
| Google: security assessment costs $15,000 to $75,000 | **Downgraded.** It comes from a dated vendor blog, and Google's FAQ says prices are set by independent assessors. Marked Secondary. | Nylas blog; Google FAQ |
| Google: the vendor blog's requirements list | **Corrected.** The blog omits the homepage and privacy-policy requirement that Google's own page states, so I used Google's page. | Google for Developers |
| LinkedIn: only a few permissions are open to all developers | Confirmed | Microsoft Learn, getting access |
| LinkedIn: review timeline and criteria for gated products | **Not published.** Marked unverified. | n/a |
| LinkedIn: whether app creation needs a company Page | Could not verify from the page read. Marked unverified. | n/a |

The live generator has been run once against a real model with web search, on Notion, and returned a complete guide. Generated guides are not hand-verified, so read the sources they cite before relying on them. I have not tested it across many apps, so some will fail or produce thin guides.
## Claim check: Notion live guide

On 29 Oct 2026 I read Notion's official public connections and authorization pages and compared them with 10 claims in the live-generated Notion guide.

- 5 matched: creation steps, installation scope options and that scope can't be changed, authorization URL location, token endpoint with Basic auth, and when redirect_uri is required.
- 1 partly matched: "Notion has no OAuth scopes". Notion's docs use "capabilities" selected at creation, which the guide leaves out.
- 1 contradicted by an official page: "Notion has no refresh tokens and the access token doesn't expire". Notion's API reference documents a Refresh a token endpoint and returns a refresh_token. The guide marked this "Sources disagree" but said it found no official statement, which was wrong. This is a real miss by the live generator: it cited the right official page in its sources but did not use it to settle the claim.
- 2 consistent with silence: no published review timeline or fee, and the owner-role requirement. The guide marked both Unverified.
- 1 not confirmed: "client secret may be shown only once". Notion's official page doesn't state it. Only an older secondary tutorial does, and the guide labelled it Secondary source with an age warning.
  
The confidence labels were mostly right: the unsupported claims were marked Unverified or Secondary source. The refresh-token claim was the exception. I checked the docs only. I did not create a Notion connection.

## Key decisions

- **Four apps chosen for variety in approval friction**, not popularity. A developer learns the most from seeing "no review", "review with no published timeline", "weeks plus an annual assessment" and "depends on the permission" side by side.
- **A fixed guide shape.** Guides are scannable and comparable, and the live agent is told to fill the same structure, so generated guides look like library guides.
- **Confidence on every claim.** Guidance developers will act on is worse than none if it sounds certain and is wrong. Missing information is reported as a finding ("Slack does not publish a Marketplace timeline").
- **Time is a range with a reason**, and says whether it is from the docs or my estimate.
- **The agent/you split is part of the guide.** It shows where an agent saves time (drafting justifications, scoping, writing the OAuth flow, checking pages) and where a human must act (sign-in, submitting forms, identity checks, paying an assessor).
- **No database.** Generated guides are encoded in the share link, which keeps the project deployable with no extra services. The trade-off is long links.
- **Guard rails on the generator:** input length limit, a per-address hourly limit and a six-hour cache, so one key cannot be drained by repeated lookups.

## Limitations

- No real setup or approval was attempted for any provider, and no paid accounts were used. Approval times come from provider documentation and are labelled.
- The live generator was not run against a real model in this repository (see above). It can produce wrong or incomplete guides for poorly documented apps, and it cannot see content behind logins.
- Provider policies change. Guides show the date they were checked, and the library should be re-checked regularly.
- Share links for generated guides are long, and in-memory caching and rate limits reset when the server restarts.
- Only four library guides, not 100.
- Live guides can say "I found no official statement" when one exists. Treat "Sources disagree" and "Unverified" claims as prompts to open the official page yourself.



