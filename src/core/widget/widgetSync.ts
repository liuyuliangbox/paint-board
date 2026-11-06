import { v4 as uuidv4 } from 'uuid'
import type {
  StoredWidgetMeta,
  StoredWidgetPayload
} from '@/store/widgetRecord'
import { cloudFetch } from '@/core/sync/cloudRequest'

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

export const pushWidgets = async (
  code: string,
  bundle: Omit<WidgetSyncBundle, 'updatedAt'> & { updatedAt?: number }
): Promise<number> => {
  const updatedAt = bundle.updatedAt || Date.now()
  for (const meta of bundle.metas) {
    const item = bundle.items[meta.id]
    if (!item) {
      throw new Error(`missing_payload:${meta.id}`)
    }
    await cloudFetch('/api/widgets/sync/item', {
      method: 'PUT',
      syncCode: code,
      body: {
        meta,
        item,
        categories: bundle.categories
      }
    })
  }
  await cloudFetch('/api/widgets/sync/manifest', {
    method: 'PUT',
    syncCode: code,
    body: {
      categories: bundle.categories,
      metas: bundle.metas,
      keepIds: bundle.metas.map((meta) => meta.id)
    }
  })
  setLastSyncedAt(updatedAt)
  return updatedAt
}

export const pullWidgets = async (code: string): Promise<WidgetSyncBundle> => {
  const manifest = (await cloudFetch('/api/widgets/sync', {
    method: 'GET',
    syncCode: code
  })) as {
    categories?: string[]
    metas?: StoredWidgetMeta[]
    updatedAt?: number
  }
  const metas = Array.isArray(manifest.metas) ? manifest.metas : []
  const items: Record<string, StoredWidgetPayload> = {}
  for (const meta of metas) {
    const item = (await cloudFetch(
      `/api/widgets/sync/item?id=${encodeURIComponent(meta.id)}`,
      { method: 'GET', syncCode: code }
    )) as StoredWidgetPayload
    if (item) {
      items[meta.id] = item
    }
  }
  return {
    categories: Array.isArray(manifest.categories) ? manifest.categories : [],
    metas,
    items,
    updatedAt: Number(manifest.updatedAt) || 0
  }
}
