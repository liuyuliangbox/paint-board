export const FILE_BLOB_PREFIX = 'paint-board-file:'
export const FILE_LIST_BACKUP_KEY = 'PAINT-BOARD-FILES-BACKUP'
export const FILE_LIST_STORAGE_KEY = 'PAINT-BOARD-FILES'

export interface StoredFile {
  id: string
  boardData?: unknown
  backgroundImage?: string
  [key: string]: unknown
}

export interface PersistEnvelope {
  state: {
    currentId?: string
    files: StoredFile[]
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
const dirtyIds = new Set<string>()

export const fileBlobKey = (id: string) => `${FILE_BLOB_PREFIX}${id}`

export const markFileContentDirty = (id: string) => {
  dirtyIds.add(id)
}

export const resetFilePersistenceCache = () => {
  blobCache.clear()
  dirtyIds.clear()
}

export const heavyFilePayload = (file: StoredFile) => ({
  boardData: file.boardData ?? {},
  backgroundImage:
    typeof file.backgroundImage === 'string' ? file.backgroundImage : ''
})

export const stripFileForList = (file: StoredFile) => {
  const {
    boardData: _boardData,
    backgroundImage: _backgroundImage,
    ...rest
  } = file
  return rest
}

export const isLegacyFileRecord = (file: StoredFile) =>
  Object.prototype.hasOwnProperty.call(file, 'boardData')

const parseEnvelope = (raw: string): PersistEnvelope => {
  const parsed = JSON.parse(raw) as PersistEnvelope
  if (!parsed?.state || !Array.isArray(parsed.state.files)) {
    throw new Error('invalid file list')
  }
  return parsed
}

/** Prefer a valid envelope; fall back to backup string when primary is corrupt. */
export const resolvePersistEnvelope = (
  primary: string | null,
  backup: string | null
): PersistEnvelope => {
  if (primary) {
    try {
      return parseEnvelope(primary)
    } catch {
      // try backup below
    }
  }
  if (backup && backup !== primary) {
    return parseEnvelope(backup)
  }
  if (primary) {
    // Re-throw with primary parse for a clearer failure.
    return parseEnvelope(primary)
  }
  throw new Error('invalid file list')
}

const stripEnvelope = (envelope: PersistEnvelope): PersistEnvelope => ({
  ...envelope,
  state: {
    ...envelope.state,
    files: envelope.state.files.map(stripFileForList)
  }
})

const mergeFile = (file: StoredFile, blobRaw: string | null): StoredFile => {
  if (!blobRaw) {
    return { ...file, boardData: {}, backgroundImage: '' }
  }
  try {
    const heavy = JSON.parse(blobRaw) as {
      boardData?: unknown
      backgroundImage?: string
    }
    return {
      ...file,
      boardData: heavy.boardData ?? {},
      backgroundImage: heavy.backgroundImage ?? ''
    }
  } catch {
    // Corrupt blob: keep the list entry with an empty drawing.
    return { ...file, boardData: {}, backgroundImage: '' }
  }
}

const validStoredFiles = (files: StoredFile[]) =>
  files.filter((file) => file && typeof file.id === 'string' && file.id)

/**
 * Load the file list. A legacy record still has boardData inline; split it into
 * one key per file and keep the original string as a backup. Corrupt individual
 * blobs are skipped (empty boardData) so one bad board does not block hydration.
 */
export const readPersistedFiles = async (
  raw: string | null,
  db: KeyValueDb,
  listKey: string
): Promise<string | null> => {
  if (!raw) {
    const backupOnly = await db.get(FILE_LIST_BACKUP_KEY)
    if (!backupOnly) {
      return null
    }
    raw = backupOnly
  }

  const backup = await db.get(FILE_LIST_BACKUP_KEY)
  const envelope = resolvePersistEnvelope(raw, backup)
  const files = validStoredFiles(envelope.state.files)
  // Prefer a parseable source string for legacy return / backup writes.
  const recoveredRaw = (() => {
    try {
      parseEnvelope(raw)
      return raw
    } catch {
      return backup && backup !== raw ? backup : JSON.stringify(envelope)
    }
  })()

  if (files.some(isLegacyFileRecord)) {
    for (const file of files) {
      const serialized = JSON.stringify(heavyFilePayload(file))
      await db.set(fileBlobKey(file.id), serialized)
      blobCache.set(file.id, serialized)
    }
    await db.set(FILE_LIST_BACKUP_KEY, recoveredRaw)
    await db.set(
      listKey,
      JSON.stringify(
        stripEnvelope({ ...envelope, state: { ...envelope.state, files } })
      )
    )
    return recoveredRaw
  }

  const mergedFiles: StoredFile[] = []
  for (const file of files) {
    let blobRaw: string | null = null
    try {
      blobRaw = await db.get(fileBlobKey(file.id))
    } catch {
      blobRaw = null
    }
    if (blobRaw) {
      blobCache.set(file.id, blobRaw)
    }
    mergedFiles.push(mergeFile(file, blobRaw))
  }

  let currentId = envelope.state.currentId
  if (
    typeof currentId !== 'string' ||
    !mergedFiles.some((file) => file.id === currentId)
  ) {
    currentId = mergedFiles[0]?.id
  }

  return JSON.stringify({
    ...envelope,
    state: {
      ...envelope.state,
      currentId,
      files: mergedFiles
    }
  })
}

/**
 * Write drawing data for dirty files only, then store the list without it.
 * Removes blobs for files that are no longer in the list.
 */
export const writePersistedFiles = async (
  listKey: string,
  value: string,
  db: KeyValueDb
): Promise<void> => {
  const envelope = parseEnvelope(value)
  const files = envelope.state.files
  const nextIds = new Set(files.map((file) => file.id))

  for (const cachedId of [...blobCache.keys()]) {
    if (!nextIds.has(cachedId)) {
      await db.del(fileBlobKey(cachedId))
      blobCache.delete(cachedId)
      dirtyIds.delete(cachedId)
    }
  }

  for (const file of files) {
    const mustWrite = dirtyIds.has(file.id) || !blobCache.has(file.id)
    if (!mustWrite) {
      continue
    }
    const serialized = JSON.stringify(heavyFilePayload(file))
    if (blobCache.get(file.id) !== serialized) {
      await db.set(fileBlobKey(file.id), serialized)
      blobCache.set(file.id, serialized)
    }
    dirtyIds.delete(file.id)
  }

  await db.set(listKey, JSON.stringify(stripEnvelope(envelope)))
  await db.del(FILE_LIST_BACKUP_KEY)
}

const THUMB_PREFIX = 'paint-board-thumb:'

/** True when a storage key belongs to board list / drawing / thumbnails. */
export const isBoardStorageKey = (key: IDBValidKey) => {
  if (typeof key !== 'string') {
    return false
  }
  return (
    key === FILE_LIST_STORAGE_KEY ||
    key === FILE_LIST_BACKUP_KEY ||
    key.startsWith(FILE_BLOB_PREFIX) ||
    key.startsWith(THUMB_PREFIX)
  )
}

/**
 * Delete local board list + drawing blobs via the given key enumerator.
 * Does not touch widgets or other app keys.
 */
export const clearPersistedBoardKeys = async (
  listKeys: () => Promise<IDBValidKey[]>,
  remove: (key: IDBValidKey) => Promise<void>
) => {
  const allKeys = await listKeys()
  await Promise.all(allKeys.filter(isBoardStorageKey).map((key) => remove(key)))
  resetFilePersistenceCache()
}
