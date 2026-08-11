---
inclusion: always
---

# Workspace: EstateWatch

## Project path

The workspace root contains a Unicode right-apostrophe (U+2019) in the folder name `Bongani's MacBook Air`. This means the path **cannot be used directly in zsh shell strings** — `cd` and `git -C` will always fail with "no such file or directory".

## CRITICAL: How to run shell/git commands

Always use `python3` with a `-c` one-liner and `subprocess` so the path is handled as raw bytes:

```bash
python3 -c "
import os, subprocess
base = os.path.expanduser('~/Documents')
for e in os.scandir(base):
    if '\u2019' in e.name and 'Bongani' in e.name:
        ew = os.path.join(e.path, 'MARKETDIRECT/Apps/marketdirect/estatewatch')
        r = subprocess.run(['git', '-C', ew, 'status'], capture_output=True, text=True)
        print(r.stdout)
"
```

Replace the `subprocess.run(...)` call with whatever command is needed. Pass arguments as a **list**, never as a shell string.

**Never do this — it always fails in zsh:**
```bash
cd "/Users/bongani/Documents/Documents - Bongani's MacBook Air/..."
git -C "/Users/bongani/Documents/Documents - Bongani's MacBook Air/..." status
```

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Express + TypeScript — Vercel serverless via `server/index.ts`
- Database: Neon PostgreSQL
- Auth: Neon Auth
- Email: Resend / ZeptoMail
- SMS: Clickatell
- PDF scraping: Firecrawl + pdfjs-dist
- Deployment: Vercel

## Cron schedule

- Endpoint: `/api/cron/ingest`
- Schedule: `45 4 * * 1-6` — 04:45 UTC = **06:45 SAST**, Monday–Saturday

## Key npm scripts

| Script | What it does |
|---|---|
| `npm run build` | Runs `db:migrate` then full build (migrations auto-apply on Vercel deploy) |
| `npm run db:migrate` | Applies pending SQL migrations to Neon |
| `npm run dev` | Local dev server — run manually in terminal |
| `npm run lint` | TypeScript type check |
| `npm run test` | Run test suite |

## Migrations

Migration files live in `migrations/`. The runner (`scripts/run-migrations.mjs`) tracks applied migrations in a `schema_migrations` table. It runs automatically as part of `npm run build` (and therefore on every Vercel deploy).
