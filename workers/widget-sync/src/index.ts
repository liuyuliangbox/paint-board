/**
 * Cloud sync Worker: auth + R2 boards/widgets APIs.
 * Auth: Bearer token from POST /api/auth/login (HMAC, no KV required).
 * Header X-Sync-Code selects the sync space.
 */

export interface Env {
  WIDGETS: R2Bucket
  ALLOWED_ORIGINS: string
  SYNC_USER: string
  SYNC_PASS: string
  AUTH_SECRET?: string
}

const SYNC_CODE_RE =
  /^pbw_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_WIDGETS = 50
const MAX_CATEGORIES = 20
const MAX_BOARDS = 20
const MAX_BODY_BYTES = 100 * 1024 * 1024
const MAX_SPACE_BYTES = 2 * 1024 * 1024 * 1024
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface WidgetMeta {
  id: string
  title: string
  category?: string
  createdAt: number
  updatedAt: number
  thumbnail?: string
  size?: number
}

interface WidgetItem {
  objects: unknown[]
  thumbnail?: string
}

interface WidgetManifest {
  categories: string[]
  metas: WidgetMeta[]
  updatedAt: number
  totalBytes?: number
}

interface BoardMeta {
  id: string
  title: string
  updatedAt: number
  thumbnail?: string
  contentRevision?: number
  size?: number
}

interface BoardManifest {
  metas: BoardMeta[]
  updatedAt: number
  totalBytes?: number
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
    'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'access-control-allow-headers':
      'Content-Type, X-Sync-Code, Authorization',
    'access-control-max-age': '86400'
  }
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin
    headers.vary = 'Origin'
  }
  return headers
}

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ''
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i])
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const b64urlDecode = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const authSecret = (env: Env) => env.AUTH_SECRET || env.SYNC_PASS || ''

const hmacSign = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
}

const issueToken = async (env: Env, username: string) => {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ u: username, exp })))
  const sig = b64url(await hmacSign(authSecret(env), payload))
  return `${payload}.${sig}`
}

const verifyToken = async (env: Env, token: string) => {
  const secret = authSecret(env)
  if (!secret || !env.SYNC_USER || !env.SYNC_PASS) {
    return false
  }
  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }
  const [payload, sig] = parts
  const expected = b64url(await hmacSign(secret, payload))
  if (sig !== expected) {
    return false
  }
  try {
    const data = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payload))
    ) as { u?: string; exp?: number }
    if (data.u !== env.SYNC_USER) {
      return false
    }
    if (!data.exp || data.exp < Date.now()) {
      return false
    }
    return true
  } catch {
    return false
  }
}

const requireAuth = async (request: Request, env: Env) => {
  const header = request.headers.get('Authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) {
    return false
  }
  return verifyToken(env, match[1].trim())
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

const readSyncCode = (request: Request) => {
  const code = (request.headers.get('X-Sync-Code') || '').trim()
  if (!SYNC_CODE_RE.test(code)) {
    return null
  }
  return code
}

const tooLarge = (request: Request) => {
  const contentLength = Number(request.headers.get('content-length') || '0')
  return contentLength > MAX_BODY_BYTES
}

const widgetPrefix = (hash: string) => `widgets/${hash}`
const widgetManifestKey = (hash: string) =>
  `${widgetPrefix(hash)}/manifest.json`
const widgetItemKey = (hash: string, id: string) =>
  `${widgetPrefix(hash)}/items/${id}.json`

const boardPrefix = (hash: string) => `boards/${hash}`
const boardManifestKey = (hash: string) => `${boardPrefix(hash)}/manifest.json`
const boardItemKey = (hash: string, id: string) =>
  `${boardPrefix(hash)}/items/${id}.json`

const readWidgetManifest = async (
  env: Env,
  hash: string
): Promise<WidgetManifest> => {
  const obj = await env.WIDGETS.get(widgetManifestKey(hash))
  if (!obj) {
    return { categories: [], metas: [], updatedAt: 0, totalBytes: 0 }
  }
  const data = (await obj.json()) as WidgetManifest
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    metas: Array.isArray(data.metas) ? data.metas : [],
    updatedAt: Number(data.updatedAt) || 0,
    totalBytes: Number(data.totalBytes) || 0
  }
}

const readBoardManifest = async (
  env: Env,
  hash: string
): Promise<BoardManifest> => {
  const obj = await env.WIDGETS.get(boardManifestKey(hash))
  if (!obj) {
    return { metas: [], updatedAt: 0, totalBytes: 0 }
  }
  const data = (await obj.json()) as BoardManifest
  return {
    metas: Array.isArray(data.metas) ? data.metas : [],
    updatedAt: Number(data.updatedAt) || 0,
    totalBytes: Number(data.totalBytes) || 0
  }
}

const handleLogin = async (request: Request, env: Env) => {
  if (!env.SYNC_USER || !env.SYNC_PASS) {
    return json({ error: 'auth_not_configured' }, 503, corsHeaders(request, env))
  }
  let body: { username?: string; password?: string }
  try {
    body = (await request.json()) as { username?: string; password?: string }
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }
  if (
    body.username !== env.SYNC_USER ||
    body.password !== env.SYNC_PASS
  ) {
    return json({ error: 'invalid_credentials' }, 401, corsHeaders(request, env))
  }
  const token = await issueToken(env, env.SYNC_USER)
  return json(
    { token, expiresIn: TOKEN_TTL_MS },
    200,
    corsHeaders(request, env)
  )
}

const handleWidgetManifestGet = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  const hash = await hashSyncCode(code)
  const manifest = await readWidgetManifest(env, hash)
  return json(
    {
      categories: manifest.categories,
      metas: manifest.metas.slice(0, MAX_WIDGETS),
      updatedAt: manifest.updatedAt,
      totalBytes: manifest.totalBytes || 0
    },
    200,
    corsHeaders(request, env)
  )
}

const handleWidgetItemGet = async (request: Request, env: Env, id: string) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  if (!id) {
    return json({ error: 'missing_id' }, 400, corsHeaders(request, env))
  }
  const hash = await hashSyncCode(code)
  const obj = await env.WIDGETS.get(widgetItemKey(hash, id))
  if (!obj) {
    return json({ error: 'not_found' }, 404, corsHeaders(request, env))
  }
  return json(await obj.json(), 200, corsHeaders(request, env))
}

const handleWidgetItemPut = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  if (tooLarge(request)) {
    return json({ error: 'payload_too_large' }, 413, corsHeaders(request, env))
  }
  let body: {
    meta?: WidgetMeta
    item?: WidgetItem
    categories?: string[]
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }
  if (!body.meta?.id || !body.item) {
    return json({ error: 'invalid_body' }, 400, corsHeaders(request, env))
  }

  const hash = await hashSyncCode(code)
  const manifest = await readWidgetManifest(env, hash)
  const raw = JSON.stringify(body.item)
  const size = new TextEncoder().encode(raw).length
  if (size > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413, corsHeaders(request, env))
  }

  const existing = manifest.metas.find((meta) => meta.id === body.meta!.id)
  const prevSize = existing?.size || 0
  const nextTotal = (manifest.totalBytes || 0) - prevSize + size
  if (nextTotal > MAX_SPACE_BYTES) {
    return json({ error: 'space_quota_exceeded' }, 413, corsHeaders(request, env))
  }

  const nextMeta: WidgetMeta = {
    ...body.meta,
    thumbnail: body.meta.thumbnail || body.item.thumbnail,
    size,
    updatedAt: Number(body.meta.updatedAt) || Date.now()
  }
  const metas = existing
    ? manifest.metas.map((meta) =>
        meta.id === nextMeta.id ? nextMeta : meta
      )
    : [...manifest.metas, nextMeta]
  if (metas.length > MAX_WIDGETS) {
    return json({ error: 'widget_limit' }, 400, corsHeaders(request, env))
  }

  const categories = Array.isArray(body.categories)
    ? body.categories.slice(0, MAX_CATEGORIES)
    : manifest.categories

  await env.WIDGETS.put(widgetItemKey(hash, nextMeta.id), raw, {
    httpMetadata: { contentType: 'application/json' }
  })
  const updatedAt = Date.now()
  await env.WIDGETS.put(
    widgetManifestKey(hash),
    JSON.stringify({
      categories,
      metas,
      updatedAt,
      totalBytes: nextTotal
    } satisfies WidgetManifest),
    { httpMetadata: { contentType: 'application/json' } }
  )
  return json({ ok: true, updatedAt, size }, 200, corsHeaders(request, env))
}

const handleWidgetManifestPut = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  let body: {
    categories?: string[]
    metas?: WidgetMeta[]
    keepIds?: string[]
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }

  const hash = await hashSyncCode(code)
  const current = await readWidgetManifest(env, hash)
  const keepIds = new Set(
    Array.isArray(body.keepIds)
      ? body.keepIds
      : (body.metas || []).map((meta) => meta.id)
  )
  const metas = (Array.isArray(body.metas) ? body.metas : current.metas)
    .filter((meta) => keepIds.has(meta.id))
    .slice(0, MAX_WIDGETS)
  const categories = Array.isArray(body.categories)
    ? body.categories.slice(0, MAX_CATEGORIES)
    : current.categories

  let cursor: string | undefined
  do {
    const listed = await env.WIDGETS.list({
      prefix: `${widgetPrefix(hash)}/items/`,
      cursor
    })
    for (const object of listed.objects) {
      const id = object.key.split('/').pop()?.replace(/\.json$/, '') || ''
      if (id && !keepIds.has(id)) {
        await env.WIDGETS.delete(object.key)
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  const totalBytes = metas.reduce((sum, meta) => sum + (meta.size || 0), 0)
  const updatedAt = Date.now()
  await env.WIDGETS.put(
    widgetManifestKey(hash),
    JSON.stringify({
      categories,
      metas,
      updatedAt,
      totalBytes
    } satisfies WidgetManifest),
    { httpMetadata: { contentType: 'application/json' } }
  )
  return json({ ok: true, updatedAt, count: metas.length }, 200, corsHeaders(request, env))
}

const handleBoardManifestGet = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  const hash = await hashSyncCode(code)
  const manifest = await readBoardManifest(env, hash)
  return json(
    {
      metas: manifest.metas.slice(0, MAX_BOARDS),
      updatedAt: manifest.updatedAt,
      totalBytes: manifest.totalBytes || 0
    },
    200,
    corsHeaders(request, env)
  )
}

const handleBoardItemGet = async (request: Request, env: Env, id: string) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  if (!id) {
    return json({ error: 'missing_id' }, 400, corsHeaders(request, env))
  }
  const hash = await hashSyncCode(code)
  const obj = await env.WIDGETS.get(boardItemKey(hash, id))
  if (!obj) {
    return json({ error: 'not_found' }, 404, corsHeaders(request, env))
  }
  return json(await obj.json(), 200, corsHeaders(request, env))
}

const handleBoardItemPut = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  if (tooLarge(request)) {
    return json({ error: 'payload_too_large' }, 413, corsHeaders(request, env))
  }
  let board: Record<string, unknown>
  try {
    board = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }
  const id = typeof board.id === 'string' ? board.id : ''
  if (!id) {
    return json({ error: 'invalid_board' }, 400, corsHeaders(request, env))
  }

  const hash = await hashSyncCode(code)
  const manifest = await readBoardManifest(env, hash)
  const raw = JSON.stringify(board)
  const size = new TextEncoder().encode(raw).length
  if (size > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413, corsHeaders(request, env))
  }

  const existing = manifest.metas.find((meta) => meta.id === id)
  const prevSize = existing?.size || 0
  const nextTotal = (manifest.totalBytes || 0) - prevSize + size
  if (nextTotal > MAX_SPACE_BYTES) {
    return json({ error: 'space_quota_exceeded' }, 413, corsHeaders(request, env))
  }

  const thumbnail =
    typeof board.thumbnail === 'string' ? board.thumbnail : existing?.thumbnail
  const nextMeta: BoardMeta = {
    id,
    title: typeof board.title === 'string' ? board.title : existing?.title || id,
    updatedAt: Date.now(),
    thumbnail,
    contentRevision:
      typeof board.contentRevision === 'number'
        ? board.contentRevision
        : existing?.contentRevision,
    size
  }
  const metas = existing
    ? manifest.metas.map((meta) => (meta.id === id ? nextMeta : meta))
    : [...manifest.metas, nextMeta]
  if (metas.length > MAX_BOARDS) {
    return json({ error: 'board_limit' }, 400, corsHeaders(request, env))
  }

  // Strip large thumbnail from stored board body if duplicated on meta only —
  // keep board as-is for round-trip fidelity.
  await env.WIDGETS.put(boardItemKey(hash, id), raw, {
    httpMetadata: { contentType: 'application/json' }
  })
  const updatedAt = Date.now()
  await env.WIDGETS.put(
    boardManifestKey(hash),
    JSON.stringify({
      metas,
      updatedAt,
      totalBytes: nextTotal
    } satisfies BoardManifest),
    { httpMetadata: { contentType: 'application/json' } }
  )
  return json({ ok: true, updatedAt, size }, 200, corsHeaders(request, env))
}

const handleBoardItemsDelete = async (request: Request, env: Env) => {
  const code = readSyncCode(request)
  if (!code) {
    return json({ error: 'invalid_sync_code' }, 400, corsHeaders(request, env))
  }
  let body: { ids?: string[] }
  try {
    body = (await request.json()) as { ids?: string[] }
  } catch {
    return json({ error: 'invalid_json' }, 400, corsHeaders(request, env))
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  if (!ids.length) {
    return json({ error: 'missing_ids' }, 400, corsHeaders(request, env))
  }
  const remove = new Set(ids)
  const hash = await hashSyncCode(code)
  const manifest = await readBoardManifest(env, hash)
  for (const id of remove) {
    await env.WIDGETS.delete(boardItemKey(hash, id))
  }
  const metas = manifest.metas.filter((meta) => !remove.has(meta.id))
  const totalBytes = metas.reduce((sum, meta) => sum + (meta.size || 0), 0)
  const updatedAt = Date.now()
  await env.WIDGETS.put(
    boardManifestKey(hash),
    JSON.stringify({
      metas,
      updatedAt,
      totalBytes
    } satisfies BoardManifest),
    { httpMetadata: { contentType: 'application/json' } }
  )
  return json(
    { ok: true, updatedAt, removed: ids.length },
    200,
    corsHeaders(request, env)
  )
}

const normalizePath = (pathname: string) =>
  pathname.replace(/\/+$/, '') || '/'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      })
    }

    if (path === '/api/auth/login' || path.endsWith('/api/auth/login')) {
      if (request.method !== 'POST') {
        return json(
          { error: 'method_not_allowed' },
          405,
          corsHeaders(request, env)
        )
      }
      return handleLogin(request, env)
    }

    const needsAuth =
      path.includes('/api/widgets/') || path.includes('/api/boards/')
    if (needsAuth) {
      const ok = await requireAuth(request, env)
      if (!ok) {
        return json({ error: 'unauthorized' }, 401, corsHeaders(request, env))
      }
    }

    if (path.endsWith('/api/widgets/sync/item')) {
      if (request.method === 'GET') {
        return handleWidgetItemGet(
          request,
          env,
          url.searchParams.get('id') || ''
        )
      }
      if (request.method === 'PUT') {
        return handleWidgetItemPut(request, env)
      }
    }

    if (path.endsWith('/api/widgets/sync/manifest')) {
      if (request.method === 'PUT') {
        return handleWidgetManifestPut(request, env)
      }
    }

    if (path.endsWith('/api/widgets/sync')) {
      if (request.method === 'GET') {
        return handleWidgetManifestGet(request, env)
      }
    }

    if (path.endsWith('/api/boards/sync/item')) {
      if (request.method === 'GET') {
        return handleBoardItemGet(
          request,
          env,
          url.searchParams.get('id') || ''
        )
      }
      if (request.method === 'PUT') {
        return handleBoardItemPut(request, env)
      }
    }

    if (path.endsWith('/api/boards/sync/items')) {
      if (request.method === 'DELETE') {
        return handleBoardItemsDelete(request, env)
      }
    }

    if (path.endsWith('/api/boards/sync')) {
      if (request.method === 'GET') {
        return handleBoardManifestGet(request, env)
      }
    }

    return json({ error: 'not_found' }, 404, corsHeaders(request, env))
  }
}
