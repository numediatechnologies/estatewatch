# Vercel deployment

EstateWatch requires Node.js 22 or newer. Configure these server-side environment
variables in the Vercel project before deployment:

- `DATABASE_URL`
- `FIRECRAWL_API_KEY`
- `ADMIN_API_TOKEN`
- `APP_URL`
- `LEADS_CONTACT_WEBHOOK_URL`
- `LEADS_CONTACT_WEBHOOK_KEY`
- SMTP variables from `.env.example` when real email delivery is enabled

Do not set `SEED_DEMO_DATA` in production. Apply the database schema explicitly with
`npm run db:init` from a controlled environment before serving traffic.

After deployment, verify `/api/health`, then call `/api/run-fetch` with the admin
Bearer token and `{"maxPages":1}`. A successful deployment must return normalized
J193 results and must reject the same request without the token.
