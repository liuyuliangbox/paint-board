# Widget / Board sync Worker (R2)

Cloud sync for reusable widgets and boards. Browser calls require a login token; sync code (`X-Sync-Code`) selects the storage space.

## Auth

1. Set secrets (required for login):

```sh
npx wrangler secret put SYNC_USER
npx wrangler secret put SYNC_PASS
# optional; defaults to SYNC_PASS
npx wrangler secret put AUTH_SECRET
```

2. `POST /api/auth/login` with `{ "username", "password" }` → `{ token, expiresIn }`
3. All `/api/widgets/*` and `/api/boards/*` need `Authorization: Bearer <token>`

Local app features work without login; only cloud actions need it.

## Board API

- `GET /api/boards/sync` — manifest (list + thumbnails)
- `GET /api/boards/sync/item?id=` — one board
- `PUT /api/boards/sync/item` — upsert one board (body = full board JSON)
- `DELETE /api/boards/sync/items` — `{ ids: string[] }`

## Widget API (per-item)

- `GET /api/widgets/sync` — manifest only
- `GET /api/widgets/sync/item?id=` — one widget payload
- `PUT /api/widgets/sync/item` — `{ meta, item, categories? }`
- `PUT /api/widgets/sync/manifest` — align metas/categories and prune orphans

Header: `X-Sync-Code` (`pbw_` + UUID).

## Limits

- Single request body up to ~100MB
- Per sync space: 20 boards, 50 widgets, ~2GB total

## Deploy

```sh
npx wrangler r2 bucket create paint-board-widgets
cd workers/widget-sync
npm install
npx wrangler deploy
```

Point the frontend at the Worker URL via `.env.production` / `VITE_WIDGET_SYNC_URL`.

CORS origins: `ALLOWED_ORIGINS` in `wrangler.toml`.
