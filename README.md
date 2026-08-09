# EstateWatch

EstateWatch is a MarketDirect.co.za service that helps South African professionals find relevant deceased-estate notices and take a clear next step.

## Brand voice and South African English

All customer-facing EstateWatch copy follows the MarketDirect.co.za brand voice. Write like a practical South African business partner: clear, grounded, encouraging and action-oriented. Keep sentences short, remove unnecessary technical language and explain what the user can do next.

- Always write the parent brand as `MarketDirect.co.za`.
- Use South African English, including `adviser`, `personalised`, `authorised`, `organisation`, `licence` as a noun and `licensing` where relevant.
- Prefer plain terms such as “estate notice”, “set an alert”, “saved opportunity” and “take the next step”.
- Use short, direct calls to action such as “Start Alert”, “View Notice”, “Save Opportunity” and “Contact Support”.
- Do not name databases, hosting providers, scraping providers, email providers or internal processing tools in public or ordinary-user screens.
- Technical service names and operational diagnostics are for authenticated administrators only.
- Do not make unsupported speed, coverage, accuracy, value, property or legal-outcome claims.

The voice is simple, practical and reliable. It should feel built for South Africans, without slang, hype or corporate stiffness.

EstateWatch discovers South African Government Gazette J193 issues, extracts genuine deceased-estate records, matches saved alerts, and sends email notifications. The production pipeline is intentionally conservative: fields absent from J193 notices stay `Unknown`, uncertain records are rejected for review, and reruns do not create duplicate estates or emails.

## Production workflow

1. Vercel Cron calls `GET /api/cron/ingest` at 04:30 UTC Monday–Saturday.
2. Firecrawl **Scrape** reads the paginated `J193` search result pages on Gazettes.Africa. Firecrawl Agent is not used.
3. Only unseen direct PDF source URLs are processed.
4. PDFs with embedded text are downloaded and extracted locally with `pdfjs-dist`.
5. The deterministic `j193-v1` parser splits estate-number records and parses fields `(2)`–`(6)`.
6. Valid records are stored, matched against active surname/province alerts, and sent through Resend.
7. Unique issue, estate-source, and alert/estate/channel constraints make reruns idempotent.

Vercel Cron is the only production scheduler. Do not add a second GitHub Actions, Make.com or external scraping schedule: duplicate schedulers waste credits, create noisy failures and can overlap ingestion runs. GitHub Actions may still run offline tests, but it must not trigger Gazette discovery or ingestion.

Gazette notices do not reliably state estate value, asset type, property ownership, or later executor workflow status. EstateWatch therefore returns `Unknown` for unsupported enrichment and does not advertise WhatsApp delivery. OCR and manual review are future additions for image-only or uncertain notices.

## Requirements

- Node.js 22 or newer
- Neon PostgreSQL with Neon Auth enabled
- Firecrawl API key
- Resend API key and a verified sender domain
- Vercel project for deployment and cron

Copy `.env.example` to `.env` for local use. Never commit secrets.

```bash
npm install
npm run db:init
npm test
npm run lint
npm run build
npm run dev
```

Production database initialization is additive and never seeds demo rows. Frontend demo data/login require explicit development-only flags. Registration, sign-in, and password recovery are verified by hosted Neon Auth through the EstateWatch API. Reset requests always return a generic account-safe response; emailed links open the EstateWatch reset form and expired or invalid tokens are rejected. The API issues a signed HttpOnly session, restores it on reload, and resolves roles server-side. Users cannot select their own role. The configured `ADMIN_EMAIL` receives administrator access and bypasses subscription/payment gates.

## Environment variables

Server-only:

```text
DATABASE_URL                 Neon pooled PostgreSQL connection string
FIRECRAWL_API_KEY            Firecrawl server API key
RESEND_API_KEY               Resend server API key
RESEND_FROM                  e.g. EstateWatch <alerts@tenders.marketdirect.co.za>
CLICKATELL_API_KEY           optional Clickatell key for secondary SMS alerts
APP_URL                      canonical public application URL
ADMIN_API_TOKEN              bearer token for administrative APIs
AUTH_SESSION_SECRET          signs HttpOnly application sessions
IDENTITY_MATCH_SECRET        HMAC secret for privacy-preserving exact SA ID matching
ADMIN_EMAIL                  verified Neon account granted administrator role
CRON_SECRET                  Vercel Cron bearer secret
ESTATEWATCH_ALERT_EMAIL      optional controlled-test fallback recipient
NEON_AUTH_BASE_URL           Neon Auth server URL
```

Build-time browser configuration:

```text
VITE_NEON_AUTH_URL           Neon Auth public URL
```

Optional local-only flags:

```text
VITE_ENABLE_DEMO_DATA=true
VITE_ENABLE_DEMO_LOGIN=true
```

## Commands

```bash
npm test                     # deterministic offline suite
npm run lint                 # TypeScript validation
npm run build                # production build
npm run fetch-gazettes       # same normalized discovery implementation as API
npm run test:firecrawl:live  # opt-in, bounded live Firecrawl Scrape request
```

The live Firecrawl test consumes credits, requires `FIRECRAWL_API_KEY`, and is never part of the ordinary test command or CI by default.

## API

- `GET /api/health` — API/database readiness and deployed revision, without secrets.
- `GET /api/cron/ingest` — protected scheduled discovery and ingestion.
- `POST /api/run-fetch` — protected discovery diagnostic.
- `POST /api/ingest-gazettes` — protected manual ingestion.
- `POST /api/admin/migrate` — protected additive schema migration.
- Alert mutation and notification-send routes are protected by `ADMIN_API_TOKEN`.

Use `Authorization: Bearer <token>` for administrative endpoints. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.

`POST /api/run-fetch` returns the date window, pages inspected, normalized Gazette metadata, warnings, and source method. Ingestion returns accepted, rejected, duplicate, match, notification, and per-source error counts.

## J193 fields

For accepted records the parser preserves estate number, deceased name, masked identity number, date of birth, last address, date/place of death, spouse details, executor or representative details, executor address, claim period, Gazette number/date/page/source URL, and parser version. Raw identity numbers are never stored or emailed.

Production alert criteria are deliberately limited to reliably published J193 fields: surname and province/Master's Office area. Estate value and asset type remain `Unknown` and are not offered as alert filters. Email is always the default notification channel; Clickatell SMS can be enabled per alert as a best-effort secondary channel and its failure never blocks email. Manual Firecrawl discovery, ingestion, and parser controls are visible only to administrators; uncertain records are rejected for review rather than enriched with invented data.

Firecrawl discovery follows Gazette search pagination from page 1 up to a ten-page safety cap, stopping on an empty page or the first record outside the rolling four-month window. URLs are deduplicated during discovery, completed Gazette source URLs are skipped, estates are unique by source ID and estate number, and notifications are unique by alert, estate, and channel.

The known launch fixture is Government Gazette 55077 part 1, published 31 July 2026. Its HOOSAIN entry is used in deterministic parser and alert tests. Test fixtures are source evidence, not fabricated production rows.

## Email delivery

Resend sends responsive HTML and independently rendered plain text. Messages include a personalized or professional fallback greeting, exact match reasons, verified Gazette fields, masked identity data, source attribution, CTA, and POPIA footer. Each CTA deep-links to the exact persisted estate record (`?estate=<id>`), which opens the online detail view directly. Gazette-derived text is HTML-escaped. Notification state is recorded as `queued`, `sent`, or `failed`, including provider message ID, attempts, errors, and timestamps.

The current sender domain must have verified SPF and DKIM. Click tracking remains disabled while its tracking DNS record is unresolved.

## Release gates

Deploy Preview first and verify tests, TypeScript, build, migrations, `/api/health`, unauthorized `401` responses, Neon Auth registration/sign-in/session/logout/password-reset flows, Firecrawl discovery, Gazette 55077 parsing, alert matching, one authorized Resend delivery, and duplicate suppression. Promote that tested revision to Production only after all checks pass, then verify the custom domain and cron configuration.

POPIA/legal review remains a commercial-launch requirement even after technical deployment.
