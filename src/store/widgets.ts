import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { v4 as uuidv4 } from 'uuid'
import { produce } from 'immer'
import {
  WIDGET_LIST_STORAGE_KEY,
  WIDGET_UNCATEGORIZED,
  readPersistedWidgets,
  writePersistedWidgets,
  loadWidgetPayload,
  type StoredWidgetMeta,
  type StoredWidgetPayload
} from './widgetRecord'
import { captureSelectionObjects } from '@/core/widget/widget'
import { renderWidgetThumbnail } from '@/core/widget/widgetThumbnail'

export const MAX_WIDGET_COUNT = 50
export const MAX_WIDGET_CATEGORY_COUNT = 20
export const WIDGET_DRAG_MIME = 'application/x-paint-board-widget'
export const WIDGET_CATEGORY_ALL = 'all'

export { WIDGET_UNCATEGORIZED }

const widgetDb = {
  get: async (key: string) => (await get(key)) || null,
  set: (key: string, value: string) => set(key, value),
  del: (key: string) => del(key)
}

/** In-memory object payloads keyed by widget id; flushed with the list. */
const payloadCache = new Map<string, StoredWidgetPayload>()

const normalizeCategory = (value?: string) => {
  const next = (value || '').trim()
  return next || WIDGET_UNCATEGORIZED
}

const storage: StateStorage = {
  getItem: async (name: string) => {
    return readPersistedWidgets((await get(name)) || null, widgetDb)
  },
  setItem: async (name: string, value: string) => {
    const payloads: Record<string, StoredWidgetPayload> = {}
    payloadCache.forEach((payload, id) => {
      payloads[id] = payload
    })
    const envelope = JSON.parse(value) as {
      state: { widgets: StoredWidgetMeta[] }
    }
    for (const meta of envelope.state.widgets) {
      if (!payloads[meta.id] && payloadCache.has(meta.id)) {
        payloads[meta.id] = payloadCache.get(meta.id) as StoredWidgetPayload
      }
    }
    await writePersistedWidgets(name, value, payloads, widgetDb)
  },
  removeItem: async (name: string) => {
    await del(name)
  }
}

interface WidgetState {
  widgets: StoredWidgetMeta[]
  /** User-defined category names (excludes uncategorized). */
  categories: string[]
  /** Active filter tab: all | uncategorized | custom name. */
  activeCategory: string
  panelOpen: boolean
}

interface WidgetAction {
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  setActiveCategory: (category: string) => void
  addCategory: (name: string) => boolean
  removeCategory: (name: string) => void
  addWidgetFromSelection: (
    title?: string,
    category?: string
  ) => Promise<boolean>
  renameWidget: (id: string, title: string) => void
  setWidgetCategory: (id: string, category: string) => void
  deleteWidget: (id: string) => void
  getWidgetObjects: (id: string) => Promise<unknown[] | null>
}

const useWidgetStore = create<WidgetState & WidgetAction>()(
  persist(
    (set, get) => ({
      widgets: [],
      categories: [],
      activeCategory: WIDGET_CATEGORY_ALL,
      panelOpen: true,
      setPanelOpen(open) {
        set({ panelOpen: open })
      },
      togglePanel() {
        set({ panelOpen: !get().panelOpen })
      },
      setActiveCategory(category) {
        set({ activeCategory: category })
      },
      addCategory(name) {
        const next = name.trim()
        if (!next || next === WIDGET_UNCATEGORIZED || next === WIDGET_CATEGORY_ALL) {
          return false
        }
        const { categories } = get()
        if (
          categories.includes(next) ||
          categories.length >= MAX_WIDGET_CATEGORY_COUNT
        ) {
          return false
        }
        set(
          produce((state: WidgetState) => {
            state.categories.push(next)
            state.activeCategory = next
          })
        )
        return true
      },
      removeCategory(name) {
        const target = name.trim()
        if (!target || target === WIDGET_UNCATEGORIZED) {
          return
        }
        set(
          produce((state: WidgetState) => {
            state.categories = state.categories.filter((item) => item !== target)
            state.widgets.forEach((widget) => {
              if (normalizeCategory(widget.category) === target) {
                widget.category = WIDGET_UNCATEGORIZED
                widget.updatedAt = Date.now()
              }
            })
            if (state.activeCategory === target) {
              state.activeCategory = WIDGET_CATEGORY_ALL
            }
          })
        )
      },
      async addWidgetFromSelection(title, category) {
        if (get().widgets.length >= MAX_WIDGET_COUNT) {
          return false
        }
        const objects = await captureSelectionObjects()
        if (!objects.length) {
          return false
        }
        const active = get().activeCategory
        const resolvedCategory = normalizeCategory(
          category ||
            (active !== WIDGET_CATEGORY_ALL ? active : WIDGET_UNCATEGORIZED)
        )
        const id = uuidv4()
        const now = Date.now()
        const thumbnail = await renderWidgetThumbnail(objects)
        const meta: StoredWidgetMeta = {
          id,
          title: (title || '').trim() || `Widget ${get().widgets.length + 1}`,
          category: resolvedCategory,
          createdAt: now,
          updatedAt: now,
          thumbnail
        }
        payloadCache.set(id, { objects, thumbnail })
        set(
          produce((state: WidgetState) => {
            if (
              resolvedCategory !== WIDGET_UNCATEGORIZED &&
              !state.categories.includes(resolvedCategory)
            ) {
              state.categories.push(resolvedCategory)
            }
            state.widgets.unshift(meta)
          })
        )
        return true
      },
      renameWidget(id, title) {
        const next = title.trim()
        if (!next) {
          return
        }
        set(
          produce((state: WidgetState) => {
            const widget = state.widgets.find((item) => item.id === id)
            if (widget) {
              widget.title = next
              widget.updatedAt = Date.now()
            }
          })
        )
      },
      setWidgetCategory(id, category) {
        const next = normalizeCategory(category)
        set(
          produce((state: WidgetState) => {
            const widget = state.widgets.find((item) => item.id === id)
            if (!widget) {
              return
            }
            widget.category = next
            widget.updatedAt = Date.now()
            if (
              next !== WIDGET_UNCATEGORIZED &&
              !state.categories.includes(next)
            ) {
              state.categories.push(next)
            }
          })
        )
      },
      deleteWidget(id) {
        payloadCache.delete(id)
        set(
          produce((state: WidgetState) => {
            state.widgets = state.widgets.filter((item) => item.id !== id)
          })
        )
      },
      async getWidgetObjects(id) {
        const cached = payloadCache.get(id)
        if (cached) {
          return cached.objects
        }
        const payload = await loadWidgetPayload(id, widgetDb)
        if (!payload) {
          return null
        }
        payloadCache.set(id, payload)
        return payload.objects
      }
    }),
    {
      name: WIDGET_LIST_STORAGE_KEY,
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        widgets: state.widgets,
        categories: state.categories,
        activeCategory: state.activeCategory,
        panelOpen: state.panelOpen
      }),
      merge: (persisted, current) => {
        const data = (persisted || {}) as Partial<WidgetState>
        return {
          ...current,
          ...data,
          widgets: (data.widgets || []).map((widget) => ({
            ...widget,
            category: normalizeCategory(widget.category)
          })),
          categories: Array.isArray(data.categories) ? data.categories : [],
          activeCategory: data.activeCategory || WIDGET_CATEGORY_ALL
        }
      }
    }
  )
)

export const widgetCategoryOf = (widget: StoredWidgetMeta) =>
  normalizeCategory(widget.category)

export default useWidgetStore
