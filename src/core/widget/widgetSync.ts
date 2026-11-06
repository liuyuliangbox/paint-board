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

export interface CloudWidgetMeta extends StoredWidgetMeta {
  size?: number
}

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

export const listCloudWidgets = async (
  code: string
): Promise<{
  categories: string[]
  metas: CloudWidgetMeta[]
  updatedAt: number
}> => {
  const data = (await cloudFetch('/api/widgets/sync', {
    method: 'GET',
    syncCode: code
  })) as {
    categories?: string[]
    metas?: CloudWidgetMeta[]
    updatedAt?: number
  }
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    metas: Array.isArray(data.metas) ? data.metas : [],
    updatedAt: Number(data.updatedAt) || 0
  }
}

export const fetchCloudWidget = async (
  code: string,
  id: string
): Promise<StoredWidgetPayload> => {
  const item = (await cloudFetch(
    `/api/widgets/sync/item?id=${encodeURIComponent(id)}`,
    { method: 'GET', syncCode: code }
  )) as StoredWidgetPayload
  if (!item || !Array.isArray(item.objects)) {
    throw new Error('not_found')
  }
  return item
}

export const upsertCloudWidget = async (
  meta: StoredWidgetMeta,
  item: StoredWidgetPayload,
  categories?: string[]
) => {
  await cloudFetch('/api/widgets/sync/item', {
    method: 'PUT',
    syncCode: getMySyncCode(),
    body: {
      meta,
      item,
      categories
    }
  })
}

export const deleteCloudWidgets = async (ids: string[]) => {
  await cloudFetch('/api/widgets/sync/items', {
    method: 'DELETE',
    syncCode: getMySyncCode(),
    body: { ids }
  })
}
