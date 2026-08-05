# Estate Watch — No-Code Product Blueprint

**Core differentiator:** Not a static estate database — users configure **alerts** (by surname, province, estate value band, asset type, executor status) and get **push/email/WhatsApp notified** the instant a matching deceased estate is officially reported.

---

## 1. Ideation & Research

**Problem statement**
In South Africa, deceased estates are only formally announced via the Government Gazette (deceased estates section) and the Master of the High Court's records. This data is public but unstructured (PDF notices), unsearchable, and unmonitored. Professionals who need to act quickly on new estates currently rely on manually paging through weekly Gazette PDFs — slow, error-prone, and impossible to scale.

**Who feels this pain**
- **Estate attorneys / administrators** — need early notice of new estates to pitch administration services to executors/heirs.
- **Heir & asset tracers / genealogists** — search for unclaimed inheritances tied to specific surnames or regions.
- **Property investors** — deceased estate property often sells below market once wound up; early notice = first-mover advantage.
- **Funeral homes & memorial services** — cross-sell (headstones, memorial planning) shortly after death notices.
- **Financial advisors / insurers** — trace unclaimed policy or pension payouts linked to the deceased.
- **Debt collectors / credit providers** — need to lodge claims against an estate within the statutory window.

**Competitive scan**
No direct SA competitor doing *alert-based* monitoring of deceased estates. Adjacent models exist in the US/UK (probate lead-gen services, e.g. subscription lead feeds for probate attorneys and real estate investors) — validates demand for the model, but the SA Gazette/Master's Office data source is untapped.

**Opportunity map**
| Segment | Core need | Willingness to pay |
|---|---|---|
| Estate attorneys | Early lead flow | High |
| Property investors | Off-market probate property | High |
| Heir tracers | Surname/region matching | Medium-High |
| Funeral homes | Timely outreach | Medium |
| Debt collectors | Claim-window alerts | Medium |

**Output:** Problem = no structured, monitorable feed of SA deceased estates. Opportunity = a subscription alert layer sitting on top of Gazette/Master's Office public data.

### Market Size

**Total addressable pool of estates**
South Africa's death rate sits at roughly 8.7 deaths per 1,000 population against a population of about 63 million — approximately **540,000–550,000 deaths per year**. Not all of these open a formal estate at the Master's Office (many are informal, no-asset households processed at a magistrate's service point under the R125,000 threshold, or handled via letters of authority under R250,000). A reasonable working estimate, pending direct confirmation from Master's Office / FISA data, is **150,000–250,000 formally reportable estates per year** nationally — this range should be validated with StatsSA/DoJ before it goes in an investor deck, but it's the right order of magnitude to size a national alerting product.

**Structural tailwind — the backlog**
The system is under real strain: the backlog with manual cases within the Master's offices hasn't been recently quantified because of how dynamic operations are, and billions of rands remain tied up in unfinalised estates. Delays are common due to understaffing, digitisation projects, and historical backlogs from COVID-19 and a 2021 ransomware attack, and current backlogs at the larger Masters' offices (Johannesburg, Pretoria, Cape Town) mean file examinations often take three to four months after the L&D account is lodged. This is good for you commercially: a slow, opaque official process is exactly what creates demand for a monitoring/alerting layer — professionals need earlier visibility precisely because the process itself is so hard to track.

**Buyer-side sizing (bottom-up, more useful than the raw estate count)**
- Estate/fiduciary attorneys and firms nationally (FISA members plus the broader attorney base doing estate work) — realistic paid seats in the low thousands.
- Property investors active in probate/deceased-estate sales — a few hundred to low thousands of serious repeat buyers.
- Genealogists/heir tracers — a small, high-value niche (dozens of firms, but each estate can carry a meaningful contingency fee).
- Funeral homes and debt collectors — largest headcount but lowest willingness-to-pay per seat; best served via the pay-per-lead tier rather than subscription.

A credible bottom-up TAM: **~3,000–5,000 realistic paying seats nationally** across all segments, at a blended ARPU of R500–R1,500/mo → **roughly R20m–R80m/year** total addressable revenue at maturity. This is a niche-but-real SaaS market, not a venture-scale category — sizing it this way will serve you far better in a pitch than an inflated "R500m market" claim built off the raw death count.

### Competitor Analysis

Revised after a closer look — there's a real direct competitor here, not just adjacent tools:

| Player | What they do | Gap vs. your product |
|---|---|---|
| **Sabinet Discover** (sabinet.co.za) | The strongest existing competitor. A legal/library-market platform giving searchable access to Government and Provincial Gazettes back to 1994 (and retrospectively to 1910), with a dedicated deceased estates offering. It lets subscribers search by name or ID number and already offers daily and weekly email alerts on gazetted content. | This is genuinely close to your idea — the gap is positioning and buyer, not capability. Sabinet is priced and sold as an institutional/library-style subscription aimed at large law firms and compliance departments, not as a self-serve, affordable tool for individual attorneys, small investors, or tracers. It's email-alert-only (no WhatsApp/SMS), general-purpose (all Gazette content, not estate-workflow-specific), and has no pipeline/CRM layer, value-band filtering, or district-level targeting built for a specific buyer persona. It's the incumbent you're unbundling, not a company doing nothing. |
| **Nuusflits.com** | An online statutory notice newspaper (paired with LegalNotice.co.za, which appears to be the publishing arm) that carries Section 29 (creditors) and Section 35(5) (L&D account) deceased estate notices, browsable by category including a dedicated "Deceased estates" filter, with structured details per notice (estate number, ID number, date of death, executor, last address). | Not an alerting product — it's a browsable public notice board with no saved searches or push notifications evident. But it's notable as a **potential data source**: its notices are already far more structured and easier to parse than raw Gazette PDFs, since Nuusflits/LegalNotice.co.za are the ones assembling and publishing them in the first place. Worth exploring a data partnership or scrape here before building a Gazette-PDF parser from scratch. |
| **Master's Office ICMS portal** (justice.gov.za) | Free official system to check an estate's case status once you already know the reference number | No search-by-criteria, no alerts — pure lookup, not discovery |
| **Ancestry24.co.za** | Large SA genealogy platform with hundreds of databases and millions of records, new names added daily, aimed at family history research | Sends update notifications only twice monthly — batch, not real-time; genealogy-framed, not built for professional lead generation or filtering by value/district/asset type |
| **Ancestors.co.za** | Indexes deceased estates from 1994 to 2023, plus death notices, wills, and archival records, via paid subscriber search | A historical archive tool, good for tracing *past* estates — not built for being first to know about a *new* one |
| **LegalNotice.co.za** | The publishing side of the Nuusflits notice — helps executors and attorneys place compliant J193/J187 notices | Publishing tool for the executor's side, not a monitoring tool for third parties — likely the same operation behind Nuusflits, and a strong candidate for a data partnership |
| **FISA (Fiduciary Institute of SA)** | Industry body, not a product — advocacy, standards, member directory | Not a competitor, but a natural distribution/credibility partner once built |
| **International probate-lead services** (US/UK models) | Sell curated probate/deceased-estate leads to attorneys and investors on subscription | Validates the business model works elsewhere; confirms the SA gap is buyer experience, not the underlying concept |

**Revised net read:** this isn't greenfield — Sabinet already does searchable Gazette access with email alerts, sold to the institutional legal market. Your actual opening is **unbundling and repositioning**: a cheaper, self-serve, WhatsApp-first product built specifically for the workflow of an individual estate attorney, property investor, or tracer, with pipeline/CRM and criteria targeting Sabinet's general-purpose library tool doesn't offer. That's a real, defensible wedge, but it means your pitch deck and pricing need to explicitly answer "why not just use Sabinet" — and Nuusflits/LegalNotice.co.za deserve a serious look as a data source before committing to parsing raw Gazette PDFs yourself.

---

## 2. Requirements Documentation (NCRD)

Run this brief through both ChatGPT and Claude separately, then reconcile into one pack. Below is the reconciled skeleton to seed both runs.

### User Flows
1. **Sign up** → select role (attorney / investor / tracer / funeral home / other) → tailors default alert templates.
2. **Alert builder wizard** — define criteria:
   - Surname / partial name match
   - Province / magisterial district
   - Estate value band (if disclosed)
   - Asset type flag (property, business, vehicle, other)
   - Executor appointed / not yet appointed
   - Date-of-death range
3. **Notification delivery** — user chooses channel(s): email, WhatsApp, SMS, in-app push.
4. **Estate feed** — list + map view of all matched estates, filterable, with a "new" indicator.
5. **Estate detail card** — deceased name (as gazetted), estate number, date of death, magisterial district, executor name/contact if published, source Gazette reference, link to original notice.
6. **Pipeline / CRM lite** — save estate, tag status (contacted / pitched / won / dead lead), add notes.
7. **Export leads** — CSV/PDF export (Pro tier).
8. **Team seats** — agency/firm accounts with shared alert pools (Enterprise tier).
9. **Billing** — subscription management, upgrade/downgrade, invoice history.

### Database Schema (core tables)
- `users` (id, name, email, phone, role, plan_tier, created_at)
- `alerts` (id, user_id, surname_match, province, district, value_band, asset_type, executor_status, date_range, channels, active)
- `estates` (id, source_id, deceased_name, id_number_masked, date_of_death, province, district, estate_number, executor_name, executor_contact, gazette_ref, published_date, raw_text, parsed_fields_json)
- `notifications` (id, alert_id, estate_id, channel, sent_at, status)
- `pipeline` (id, user_id, estate_id, status, notes, updated_at)
- `subscriptions` (id, user_id, plan, billing_cycle, status, next_bill_date)

### UI/UX Specification

- Dashboard: active alerts summary + recent matches feed
- Alert builder: step wizard, plain-language summary of the alert before saving
- Estate feed: card list (mobile) / table (desktop), map toggle for location-based browsing
- Notification centre: read/unread, channel icons
- Billing: simple plan comparison + PayFast checkout

### Monetisation Logic| Tier | Price (indicative) | Includes |
|---|---|---|
| Free trial | R0 / 14 days | 1 alert, email only |
| Pro | R699/mo | Unlimited alerts, all channels, export |
| Agency | R2,499/mo | 5 seats, shared pipeline, API access |
| Pay-per-lead | R49/estate | For low-volume users, no subscription |

### Compliance Notes (POPIA — critical, flag prominently in NCRD)
- Source data (Gazette notices) is public record, but processing it into a searchable, alert-triggering product still constitutes "processing personal information" under POPIA.
- Need a documented lawful basis (legitimate interest — public record redistribution for professional/legal purposes), a clear privacy policy, data minimisation (mask ID numbers), retention limits, and an opt-out/removal-request channel for next-of-kin.
- Recommend legal sign-off on the compliance section before launch — this is the highest-risk part of the build, more than the tech.

**Output:** Reconciled NCRD becomes the direct build brief for Lovable.

---

## 3. Brand Identity Development

**Name candidates**
- **EstateWatch** (clear, English-first, works nationally)
- **Boedel Alert** (Afrikaans "boedel" = estate — strong resonance in a key user segment)
- **GazetteWatch**
- **ProbateSA**

**Brand personality:** precise, trustworthy, calm — this product deals with death and money, so it must never feel opportunistic or ambulance-chasing. Think "quiet professional utility," not "hot leads!"

**Tone of voice:** plain, respectful, factual. No urgency-bait copy ("ACT NOW"), no emojis in transactional messaging. Confidence through clarity, not hype.

**Visual style:** navy/charcoal base, single restrained gold or teal accent, generous whitespace, serif for headings (gravitas) + clean sans for UI. Avoid literal death imagery (no headstones, candles) — use abstract motifs: a bell/notification mark, a document/ledger icon, a compass (finding what's owed).

**Build steps**
1. If reusing CGS/marketdirect.co.za's existing kit as a base, scrape it with Firecrawl's branding extraction technique for consistency across your portfolio.
2. Generate palette in Coolors, logo in Looka, refine/mock in Photoroom.
3. Source restrained, professional stock imagery (documents, offices, hands signing — not funerals) via Pexels.

**Output:** Brand kit + logo, ready for Lovable's design tokens.

---

## 4. No-Code Build Execution

1. Feed the reconciled NCRD into **Lovable** to scaffold the MVP: auth, alert builder, estate feed, notification centre, billing.
2. **Key technical risk to flag upfront:** the Gazette is published as PDF, not an API. You will need an ingestion pipeline (see Step 5) — Lovable itself won't handle Gazette scraping/parsing natively, so this is likely the first thing to hand off to the automation layer.
3. Export to **Cursor/VS Code + Copilot** for:
   - The ingestion/parsing logic (PDF → structured JSON)
   - The alert-matching engine (efficient matching of new estates against thousands of saved alert criteria)
4. If Lovable's AI gets stuck on a feature, reverse-engineer the current codebase back into NCRD form and re-run it in Lovable — its own AI implements its own scaffolding better than patched-in code.
5. Keep architecture modular: **ingestion service**, **matching engine**, and **notification dispatcher** should be separable services, not tangled into the core app — this is the part most likely to need swapping out or scaling independently.

**Output:** Functional MVP — alert builder, estate feed, notifications working end-to-end on seeded/sample data.

---

## 5. Automation Layer (Make.com)

This product leans on automation more than most no-code builds, because the core value (timely alerting) depends on it:

- **Scheduled scrape** — weekly trigger to pull the latest Gazette deceased estates section.
- **AI parsing step** — feed each notice through Claude/GPT to extract structured fields (name, estate number, district, executor, date) from messy OCR/PDF text.
- **Matching engine trigger** — run new estates against all active alert criteria.
- **Notification dispatch** — WhatsApp Business API (or Twilio) for WhatsApp/SMS, SendGrid for email.
- **Payments** — PayFast (SA-native, avoids the cross-border card friction you hit with Uber's US-only connector).
- **Email dispatch** — Resend for reliable professional delivery from tenders.marketdirect.co.za.
- **CRM/pipeline sync** — push "won" leads into a lightweight CRM (or back into Google Sheets/Airtable if you want zero extra tooling for v1).

**Output:** Fully automated notify-on-match pipeline, no manual intervention after setup.

---

## 6. Pitch Deck & Go-to-Market

Structure for the AI-generated deck:
1. **Problem** — SA's deceased estate data is public but invisible; professionals lose deals to whoever checks the Gazette first.
2. **Solution** — EstateWatch: set an alert once, get notified the moment a match is gazetted.
3. **Market** — estate attorneys, property investors, tracers, funeral homes, debt collectors nationally; anchor with an estimate of estates reported annually in SA (worth sourcing a hard number before finalising the deck).
4. **Product demo** — alert builder → live match → WhatsApp notification, shown as a single visual flow.
5. **Monetisation** — tiered SaaS + pay-per-lead, land with the free trial, expand via agency seats.
6. **Roadmap** — v1 (Gazette-only, email/WhatsApp) → v2 (Master's Office data integration, map view) → v3 (API for legal case-management integrations).
7. **Why now** — no incumbent, public data source, WhatsApp-first delivery fits SA usage patterns.

**Output:** Investor-ready deck, branded, ready to send.

### Draft Slide Copy — "Why not just use Sabinet?"

Use this as the competition slide. It's written to be said out loud, not read as a wall of text.

> **Sabinet already searches the Gazette. We built something a Gazette search can't be.**
>
> Sabinet Discover is a general-purpose legal research platform — Gazettes, legislation, journals, tenders, all of it — sold institutionally to law firms, libraries, and compliance teams, with alerts as one feature among dozens. It's built for someone researching a document. It was never built for someone trying to be first to a new client.
>
> We built one thing: **when a matching deceased estate is gazetted, you know within minutes, on WhatsApp, with the details that matter to your business already pulled out** — district, estimated value band, executor status, asset type. No login to a research portal. No sifting a general Gazette feed. No enterprise sales call to get a quote.
>
> Sabinet answers "what's in the Gazette." We answer "should I call this executor today."

**Supporting bullets for the deck:**
- Sabinet: institutional pricing, "request a demo" sales model, general legal-research audience → not accessible or tailored to a solo attorney, individual investor, or small tracing practice.
- Us: self-serve signup, transparent tiered pricing, live in minutes.
- Sabinet: email alerts across all Gazette content types.
- Us: WhatsApp-first, deceased-estates-only, criteria built around what an estate professional actually filters on.
- Sabinet: no pipeline — you still manage leads elsewhere.
- Us: built-in status tracking from "new match" to "won," so the alert isn't the end of the workflow, it's the start of it.

**One line for the appendix, in case an investor pushes back with "but Sabinet could just add this":** they could — and if they do, it validates the category. Our advantage isn't that the feature is hard to copy, it's that Sabinet's entire go-to-market (institutional sales, general-purpose product, library/legal-research positioning) is built for a different buyer than the one we're serving.

---

### Immediate next step
The single highest-leverage thing to validate before building anything: confirm you can reliably and legally source structured deceased estate data from the Gazette (test-scrape one issue, check parse quality) — everything else in this blueprint depends on that pipeline working.
