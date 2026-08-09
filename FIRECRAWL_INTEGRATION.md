# Firecrawl integration

The canonical implementation is `server/firecrawlDiscovery.ts`. It uses the pinned
Firecrawl SDK and its Agent API to inspect paginated South African `J193` search
results from gazettes.africa. Results are limited to a rolling four-month window,
validated with Zod, deduplicated by PDF URL, and shared by the CLI and API.

## Commands

```bash
npm test                    # mocked, no credits
npm run test:firecrawl:live # one live page, opt-in
npm run fetch-gazettes      # live CLI discovery
```

`POST /api/run-fetch` performs discovery. `POST /api/ingest-gazettes` performs
discovery followed by PDF extraction, validation, persistence, matching, and
notification recording. Both write-capable endpoints require
`Authorization: Bearer $ADMIN_API_TOKEN` in production.

The live smoke test requires `FIRECRAWL_API_KEY`. It is deliberately excluded from
CI because Firecrawl calls consume credits. See the main README for setup.
