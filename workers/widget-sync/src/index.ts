/**
 * Widget sync API: R2-backed GET/PUT keyed by sync code (hashed).
 * Header: X-Sync-Code
 */

export interface Env {
  WIDGETS: R2Bucket
  ALLOWED_ORIGINS: string
}

const SYNC_CODE_RE =
  /^pbw_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_WIDGETS = 50
const MAX_CATEGORIES = 20
const MAX_BODY_BYTES = 25 * 1024 * 1024

interface SyncMeta {
  id: string
  title: string
  category?: string
  createdAt: number
  updatedAt: number
  thumbnail?: string
}

interface SyncItem {
  objects: unknown[]
  thumbnail?: string
}

interface SyncManifest {
  categories: string[]
  metas: SyncMeta[]
  updatedAt: number
}

interface SyncPutBody {
  categories: string[]
  metas: SyncMeta[]
  items: Record<string, SyncItem>
  updatedAt?: number
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  })

const allowedOrigins = (env: Env) =>
  (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const corsHeaders = (request: Request, env: Env): HeadersInit => {
  const origin = request.headers.get('Origin') || ''
  const allowed = allowedOrigins(env)
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-Sync-Code',
    'access-control-max-age': '86400'
  }
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin
    headers.vary = 'Origin'
  }
  return headers
}

const hashSyncCode = async (code: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(code.trim())
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const prefixFor = (hash: string) => `widgets/${hash}`
const manifestKey = (hash: string) => `${prefixFor(hash)}/manifest.json`
const itemKey = (hash: string, id: string) =>
  `${prefixFor(hash)}/items/${id}.json`

const readSyncCode = (request: Request) => {
  const code = (request.headers.get('X-Sync-Code') || '').trim()
  if (!SYNC_CODE_RE.test(code)) {
    return null
  }
  return code
}

const handleGet = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  const hash = await hashSyncCode(code)
  const manifestObj = await env.WIDGETS.get(manifestKey(hash))
  if (!manifestObj) {
    return json(
      { categories: [], metas: [], items: {}, updatedAt: 0 },
      200,
      corsHeaders(request, env)
    )
  }
  const manifest = (await manifestObj.json()) as SyncManifest
  const metas = Array.isArray(manifest.metas) ? manifest.metas : []
  const items: Record<string, SyncItem> = {}
  for (const meta of metas.slice(0, MAX_WIDGETS)) {
    const obj = await env.WIDGETS.get(itemKey(hash, meta.id))
    if (!obj) {
      continue
    }
    items[meta.id] = (await obj.json()) as SyncItem
  }
  return json(
    {
      categories: Array.isArray(manifest.categories) ? manifest.categories : [],
      metas,
      items,
      updatedAt: manifest.updatedAt || 0
    },
    200,
    corsHeaders(request, env)
  )
}

const handlePut = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413, corsHeaders(request, env))
  }

  let body: SyncPutBody
  try {
    body = (await request.json()) as SyncPutBody
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }

  const metas = Array.isArray(body.metas) ? body.metas.slice(0, MAX_WIDGETS) : []
  const categories = Array.isArray(body.categories)
    ? body.categories.slice(0, MAX_CATEGORIES)
    : []
  const items = body.items && typeof body.items === 'object' ? body.items : {}

  for (const meta of metas) {
    if (!meta?.id || typeof meta.id !== 'string') {
      return json({ error: 'invalid_meta' }, 400, corsHeaders(request, env))
    }
    if (!items[meta.id]) {
      return json(
        { error: 'missing_item', id: meta.id },
        400,
        corsHeaders(request, env)
      )
    }
  }

  const hash = await hashSyncCode(code)
  const updatedAt = Number(body.updatedAt) || Date.now()
  const manifest: SyncManifest = { categories, metas, updatedAt }

  await env.WIDGETS.put(manifestKey(hash), JSON.stringify(manifest), {
    httpMetadata: { contentType: 'application/json' }
  })

  const nextIds = new Set(metas.map((meta) => meta.id))
  for (const meta of metas) {
    await env.WIDGETS.put(
      itemKey(hash, meta.id),
      JSON.stringify(items[meta.id]),
      { httpMetadata: { contentType: 'application/json' } }
    )
  }

  let cursor: string | undefined
  do {
    const listed = await env.WIDGETS.list({
      prefix: `${prefixFor(hash)}/items/`,
      cursor
    })
    for (const object of listed.objects) {
      const id = object.key.split('/').pop()?.replace(/\.json$/, '') || ''
      if (id && !nextIds.has(id)) {
        await env.WIDGETS.delete(object.key)
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return json(
    { ok: true, updatedAt, count: metas.length },
    200,
    corsHeaders(request, env)
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      })
    }

    const isSyncPath =
      path === '/api/widgets/sync' || path.endsWith('/api/widgets/sync')

    if (!isSyncPath) {
      return json({ error: 'not_found' }, 404, corsHeaders(request, env))
    }

    if (request.method === 'GET') {
      return handleGet(request, env)
    }
    if (request.method === 'PUT') {
      return handlePut(request, env)
    }

    return json({ error: 'method_not_allowed' }, 405, corsHeaders(request, env))
  }
}
