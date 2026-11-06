# Widget sync Worker (R2)

Manual cloud sync for reusable widgets. The browser sends a sync code (`X-Sync-Code`); the Worker stores data under `SHA-256(code)` in R2.

## API

- `GET /api/widgets/sync` + `X-Sync-Code` → `{ categories, metas, items, updatedAt }`
- `PUT /api/widgets/sync` + `X-Sync-Code` + JSON body → overwrite that sync space
- CORS: origins listed in `ALLOWED_ORIGINS` (see `wrangler.toml`)

## One-time Cloudflare setup

1. Create an R2 bucket named `paint-board-widgets` (Dashboard → R2, or CLI):

```sh
npx wrangler r2 bucket create paint-board-widgets
```

2. From this directory, install and deploy:

```sh
cd workers/widget-sync
npm install
npx wrangler deploy
```

Use the same Cloudflare account as Pages (`CLOUDFLARE_ACCOUNT_ID` / logged-in wrangler).

3. Note the Worker URL after deploy, for example:

`https://paint-board-widget-sync.<account>.workers.dev`

4. Point the frontend at it:

- Local: create `.env.local` with  
  `VITE_WIDGET_SYNC_URL=https://paint-board-widget-sync.<account>.workers.dev`
- Production (GitHub Actions Pages deploy): set repository **Variable**  
  `VITE_WIDGET_SYNC_URL` to that same base URL (no trailing slash).

5. If the site origin changes, update `[vars].ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.

## Front-end behaviour

- **My sync code**: generated locally (`pbw_` + UUID), stored in `localStorage`.
- **Target sync code**: optional input; upload/download use it when filled, otherwise my code.
- Upload overwrites cloud for the target code.
- Download merges into local: keep existing widgets, append cloud-only ids (same id keeps local). Then upload to your own code to grow your cloud copy.
