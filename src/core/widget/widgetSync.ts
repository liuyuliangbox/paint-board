import { v4 as uuidv4 } from 'uuid'
import type {
  StoredWidgetMeta,
  StoredWidgetPayload
} from '@/store/widgetRecord'

export const MY_SYNC_CODE_KEY = 'PAINT-BOARD-WIDGET-SYNC-CODE'
export const LAST_SYNCED_AT_KEY = 'PAINT-BOARD-WIDGET-LAST-SYNCED-AT'

const SYNC_CODE_RE =
  /^pbw_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface WidgetSyncBundle {
  categories: string[]
  metas: StoredWidgetMeta[]
  items: Record<string, StoredWidgetPayload>
  updatedAt: number
}

export const isValidSyncCode = (code: string) => SYNC_CODE_RE.test(code.trim())

export const createSyncCode = () => `pbw_${uuidv4()}`

export const getMySyncCode = (): string => {
  try {
    const existing = localStorage.getItem(MY_SYNC_CODE_KEY)
    if (existing && isValidSyncCode(existing)) {
      return existing.trim()
    }
  } catch {
    // ignore storage errors
  }
  const next = createSyncCode()
  setMySyncCode(next)
  return next
}

export const setMySyncCode = (code: string) => {
  const next = code.trim()
  if (!isValidSyncCode(next)) {
    throw new Error('invalid_sync_code')
  }
  localStorage.setItem(MY_SYNC_CODE_KEY, next)
}

export const regenerateMySyncCode = (): string => {
  const next = createSyncCode()
  setMySyncCode(next)
  return next
}

export const getLastSyncedAt = (): number => {
  try {
    const raw = localStorage.getItem(LAST_SYNCED_AT_KEY)
    const value = Number(raw)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export const setLastSyncedAt = (value: number) => {
  try {
    localStorage.setItem(LAST_SYNCED_AT_KEY, String(value))
  } catch {
    // ignore
  }
}

export const getWidgetSyncBaseUrl = (): string => {
  const raw = (import.meta.env.VITE_WIDGET_SYNC_URL || '').trim()
  return raw.replace(/\/+$/, '')
}

export const isWidgetSyncConfigured = () => Boolean(getWidgetSyncBaseUrl())

const syncUrl = () => {
  const base = getWidgetSyncBaseUrl()
  if (!base) {
    throw new Error('sync_not_configured')
  }
  return `${base}/api/widgets/sync`
}

const requestSync = async (
  method: 'GET' | 'PUT',
  code: string,
  body?: WidgetSyncBundle
): Promise<WidgetSyncBundle | { ok: true; updatedAt: number }> => {
  if (!isValidSyncCode(code)) {
    throw new Error('invalid_sync_code')
  }
  const response = await fetch(syncUrl(), {
    method,
    headers: {
      'content-type': 'application/json',
      'X-Sync-Code': code.trim()
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!response.ok) {
    let detail = ''
    try {
      const data = (await response.json()) as { error?: string }
      detail = data.error || ''
    } catch {
      // ignore
    }
    throw new Error(detail || `http_${response.status}`)
  }
  return (await response.json()) as
    | WidgetSyncBundle
    | { ok: true; updatedAt: number }
}

export const pushWidgets = async (
  code: string,
  bundle: Omit<WidgetSyncBundle, 'updatedAt'> & { updatedAt?: number }
): Promise<number> => {
  const updatedAt = bundle.updatedAt || Date.now()
  const result = (await requestSync('PUT', code, {
    categories: bundle.categories,
    metas: bundle.metas,
    items: bundle.items,
    updatedAt
  })) as { ok: true; updatedAt: number }
  const next = result.updatedAt || updatedAt
  setLastSyncedAt(next)
  return next
}

export const pullWidgets = async (code: string): Promise<WidgetSyncBundle> => {
  const result = (await requestSync('GET', code)) as WidgetSyncBundle
  return {
    categories: Array.isArray(result.categories) ? result.categories : [],
    metas: Array.isArray(result.metas) ? result.metas : [],
    items: result.items && typeof result.items === 'object' ? result.items : {},
    updatedAt: Number(result.updatedAt) || 0
  }
}
