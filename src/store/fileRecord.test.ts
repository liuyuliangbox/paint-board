import { beforeEach, describe, expect, it } from 'vitest'
import {
  FILE_LIST_BACKUP_KEY,
  FILE_LIST_STORAGE_KEY,
  clearPersistedBoardKeys,
  fileBlobKey,
  isBoardStorageKey,
  markFileContentDirty,
  readPersistedFiles,
  resetFilePersistenceCache,
  writePersistedFiles,
  type KeyValueDb
} from './fileRecord'

const createDb = (): KeyValueDb & { store: Map<string, string> } => {
  const store = new Map<string, string>()
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => {
      store.set(key, value)
    },
    del: async (key) => {
      store.delete(key)
    }
  }
}

const legacy = JSON.stringify({
  state: {
    currentId: 'a',
    files: [
      {
        id: 'a',
        title: 'one',
        boardData: { objects: [{ type: 'rect' }] },
        backgroundImage: 'data:image/png;base64,aaa'
      },
      {
        id: 'b',
        title: 'two',
        boardData: {},
        backgroundImage: ''
      }
    ]
  },
  version: 0
})

describe('file records', () => {
  beforeEach(() => {
    resetFilePersistenceCache()
  })

  it('splits a legacy list and can read it back', async () => {
    const db = createDb()
    const hydrated = await readPersistedFiles(legacy, db, 'list')

    expect(hydrated).toBe(legacy)
    expect(db.store.get(FILE_LIST_BACKUP_KEY)).toBe(legacy)
    expect(JSON.parse(db.store.get(fileBlobKey('a')) || '{}')).toEqual({
      boardData: { objects: [{ type: 'rect' }] },
      backgroundImage: 'data:image/png;base64,aaa'
    })
    const list = JSON.parse(db.store.get('list') || '{}')
    expect(list.state.files[0].boardData).toBeUndefined()
    expect(list.state.files[0].title).toBe('one')

    resetFilePersistenceCache()
    const again = await readPersistedFiles(
      db.store.get('list') || null,
      db,
      'list'
    )
    expect(JSON.parse(again || '{}').state.files[0].boardData).toEqual({
      objects: [{ type: 'rect' }]
    })
  })

  it('writes only the dirty file and drops a removed file blob', async () => {
    const db = createDb()
    await readPersistedFiles(legacy, db, 'list')
    const full = JSON.parse(legacy)
    full.state.files[0].boardData = { objects: [{ type: 'path' }] }
    full.state.files = [full.state.files[0]]
    markFileContentDirty('a')

    await writePersistedFiles('list', JSON.stringify(full), db)

    expect(
      JSON.parse(db.store.get(fileBlobKey('a')) || '{}').boardData
    ).toEqual({
      objects: [{ type: 'path' }]
    })
    expect(db.store.has(fileBlobKey('b'))).toBe(false)
    expect(db.store.has(FILE_LIST_BACKUP_KEY)).toBe(false)
    const writtenList = JSON.parse(db.store.get('list') || '{}')
    expect(writtenList.state.files[0].boardData).toBeUndefined()
  })

  it('keeps the legacy list when splitting fails', async () => {
    const db = createDb()
    db.set = async (key) => {
      if (key === fileBlobKey('b')) {
        throw new Error('quota')
      }
      db.store.set(key, 'x')
    }

    await expect(readPersistedFiles(legacy, db, 'list')).rejects.toThrow(
      'quota'
    )
    expect(db.store.has('list')).toBe(false)
  })

  it('skips a corrupt blob and still hydrates sibling boards', async () => {
    const db = createDb()
    const split = JSON.stringify({
      state: {
        currentId: 'a',
        files: [
          { id: 'a', title: 'good' },
          { id: 'b', title: 'bad' }
        ]
      },
      version: 0
    })
    db.store.set('list', split)
    db.store.set(
      fileBlobKey('a'),
      JSON.stringify({ boardData: { objects: [1] }, backgroundImage: '' })
    )
    db.store.set(fileBlobKey('b'), '{not-json')

    const hydrated = JSON.parse(
      (await readPersistedFiles(db.store.get('list') || null, db, 'list')) ||
        '{}'
    )
    expect(hydrated.state.files[0].boardData).toEqual({ objects: [1] })
    expect(hydrated.state.files[1].boardData).toEqual({})
    expect(hydrated.state.files[1].title).toBe('bad')
  })

  it('falls back to backup list when the primary list is corrupt', async () => {
    const db = createDb()
    db.store.set('list', '{broken')
    db.store.set(FILE_LIST_BACKUP_KEY, legacy)

    const hydrated = await readPersistedFiles(
      db.store.get('list') || null,
      db,
      'list'
    )
    expect(JSON.parse(hydrated || '{}').state.files).toHaveLength(2)
  })

  it('clears only board-related storage keys', async () => {
    const store = new Map<string, string>([
      [FILE_LIST_STORAGE_KEY, 'list'],
      [fileBlobKey('a'), 'blob'],
      ['paint-board-thumb:a', 'thumb'],
      ['PAINT-BOARD-WIDGETS', 'keep']
    ])
    await clearPersistedBoardKeys(
      async () => [...store.keys()],
      async (key) => {
        store.delete(String(key))
      }
    )
    expect(store.has(FILE_LIST_STORAGE_KEY)).toBe(false)
    expect(store.has(fileBlobKey('a'))).toBe(false)
    expect(store.has('paint-board-thumb:a')).toBe(false)
    expect(store.get('PAINT-BOARD-WIDGETS')).toBe('keep')
    expect(isBoardStorageKey('PAINT-BOARD-WIDGETS')).toBe(false)
  })

  it('still removes the list keys when the key scan is empty', async () => {
    const store = new Map<string, string>([
      [FILE_LIST_STORAGE_KEY, 'corrupt'],
      [FILE_LIST_BACKUP_KEY, 'corrupt-backup']
    ])
    await clearPersistedBoardKeys(
      async () => [],
      async (key) => {
        store.delete(String(key))
      }
    )
    expect(store.has(FILE_LIST_STORAGE_KEY)).toBe(false)
    expect(store.has(FILE_LIST_BACKUP_KEY)).toBe(false)
  })

  it('finishes even when individual deletes throw', async () => {
    const store = new Map<string, string>([
      [FILE_LIST_STORAGE_KEY, 'corrupt'],
      [fileBlobKey('a'), 'blob']
    ])
    await clearPersistedBoardKeys(
      async () => [...store.keys()],
      async (key) => {
        if (String(key) === FILE_LIST_STORAGE_KEY) {
          throw new Error('idb locked')
        }
        store.delete(String(key))
      }
    )
    expect(store.has(fileBlobKey('a'))).toBe(false)
  })
})
