# Production pipeline

```text
Firecrawl J193 discovery
  -> direct Gazette PDF
  -> deterministic notice parser
  -> required-field validation
  -> unique source/estate check
  -> PostgreSQL estate insert
  -> active-alert matching
  -> notification record and optional email
```

Uncertain parses are rejected and returned in the ingestion errors collection. The
pipeline does not generate placeholder estate numbers, deceased names, dates,
provinces, or values. Unknown optional fields remain explicitly `Unknown`.

Before production use, run `npm run db:init` against the target database, configure
all variables documented in `.env.example`, run the live Firecrawl smoke test, and
complete the POPIA and authentication launch gates documented in the README.
