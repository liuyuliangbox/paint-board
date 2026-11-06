export const WIDGET_BLOB_PREFIX = 'paint-board-widget:'
export const WIDGET_LIST_STORAGE_KEY = 'PAINT-BOARD-WIDGETS'

/** Built-in bucket for widgets without a custom category. */
export const WIDGET_UNCATEGORIZED = 'uncategorized'

export interface StoredWidgetMeta {
  id: string
  title: string
  /** Custom category name, or WIDGET_UNCATEGORIZED. */
  category?: string
  createdAt: number
  updatedAt: number
  thumbnail?: string
}

export interface StoredWidgetPayload {
  objects: unknown[]
  thumbnail?: string
}

export interface WidgetPersistEnvelope {
  state: {
    widgets: StoredWidgetMeta[]
    [key: string]: unknown
  }
  version?: number
}

export interface KeyValueDb {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  del(key: string): Promise<void>
}

const blobCache = new Map<string, string>()

export const widgetBlobKey = (id: string) => `${WIDGET_BLOB_PREFIX}${id}`

export const resetWidgetPersistenceCache = () => {
  blobCache.clear()
}

export const readPersistedWidgets = async (
  raw: string | null,
  db: KeyValueDb
): Promise<string | null> => {
  if (!raw) {
    return null
  }
  const envelope = JSON.parse(raw) as WidgetPersistEnvelope
  if (!envelope?.state || !Array.isArray(envelope.state.widgets)) {
    throw new Error('invalid widget list')
  }

  const widgets = []
  for (const meta of envelope.state.widgets) {
    const blobRaw = await db.get(widgetBlobKey(meta.id))
    if (blobRaw) {
      blobCache.set(meta.id, blobRaw)
    }
    let thumbnail = meta.thumbnail
    if (blobRaw) {
      try {
        const payload = JSON.parse(blobRaw) as StoredWidgetPayload
        thumbnail = payload.thumbnail || thumbnail
      } catch {
        // keep meta thumbnail
      }
    }
    widgets.push({ ...meta, thumbnail })
  }

  return JSON.stringify({
    ...envelope,
    state: { ...envelope.state, widgets }
  })
}

export const writePersistedWidgets = async (
  listKey: string,
  value: string,
  payloads: Record<string, StoredWidgetPayload>,
  db: KeyValueDb
): Promise<void> => {
  const envelope = JSON.parse(value) as WidgetPersistEnvelope
  const widgets = envelope.state.widgets
  const nextIds = new Set(widgets.map((widget) => widget.id))

  for (const cachedId of [...blobCache.keys()]) {
    if (!nextIds.has(cachedId)) {
      await db.del(widgetBlobKey(cachedId))
      blobCache.delete(cachedId)
    }
  }

  for (const meta of widgets) {
    const payload = payloads[meta.id]
    if (!payload) {
      continue
    }
    const serialized = JSON.stringify(payload)
    if (blobCache.get(meta.id) !== serialized) {
      await db.set(widgetBlobKey(meta.id), serialized)
      blobCache.set(meta.id, serialized)
    }
  }

  const listOnly: WidgetPersistEnvelope = {
    ...envelope,
    state: {
      ...envelope.state,
      widgets: widgets.map(({ thumbnail: _thumbnail, ...rest }) => rest)
    }
  }
  await db.set(listKey, JSON.stringify(listOnly))
}

export const loadWidgetPayload = async (
  id: string,
  db: KeyValueDb
): Promise<StoredWidgetPayload | null> => {
  const cached = blobCache.get(id)
  const raw = cached ?? (await db.get(widgetBlobKey(id)))
  if (!raw) {
    return null
  }
  blobCache.set(id, raw)
  return JSON.parse(raw) as StoredWidgetPayload
}
