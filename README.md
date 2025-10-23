# Rental Pro (Next.js 15 + Upstash KV)

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Required Vercel Env Vars
- `KV_REST_API_URL` – from Upstash (REST URL)
- `KV_REST_API_TOKEN` – from Upstash (REST token with write access)
- `ADMIN_WRITE_KEY` – any secret (e.g. `fares`) for the access gate

## Notes
- Data is stored in Upstash KV under key `rental:store:v1`.
- The **Adding** page lets you insert apartments, tenants and ledger entries.
- The **Dashboard** computes totals and ROI per property.
