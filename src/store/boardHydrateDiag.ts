/**
 * Structured diagnosis when board IndexedDB hydrate fails or soft-recovers.
 * Shown in UI + console so “无法恢复” is never a black box.
 */

export type BoardHydrateCode =
  | 'FORCE_FRESH'
  | 'EMPTY_OK'
  | 'PRIMARY_OK'
  | 'BACKUP_RESTORED'
  | 'PRIMARY_INVALID_JSON'
  | 'PRIMARY_INVALID_SHAPE'
  | 'BACKUP_INVALID'
  | 'IDB_GET_PRIMARY_THROW'
  | 'IDB_GET_BACKUP_THROW'
  | 'IDB_BOTH_UNREADABLE'
  | 'QUOTA_EXCEEDED'
  | 'IDB_BLOCKED'
  | 'IDB_UNKNOWN'
  | 'REHYDRATE_CALLBACK_ERROR'
  | 'PERSIST_WRITE_FAIL'

export type BoardHydrateOutcome =
  | 'ok'
  | 'backup'
  | 'soft_blank'
  | 'persist_fail'

export type BoardHydratePhase =
  | 'force_fresh'
  | 'get_primary'
  | 'read_primary'
  | 'get_backup'
  | 'read_backup'
  | 'rehydrate'
  | 'persist_write'

export interface BoardHydrateDiagnosis {
  code: BoardHydrateCode
  outcome: BoardHydrateOutcome
  phase: BoardHydratePhase
  at: string
  errorName?: string
  errorMessage?: string
  primaryPresent?: boolean
  primaryLength?: number
  primaryPreview?: string
  backupPresent?: boolean
  backupLength?: number
  backupPreview?: string
  /** Human-oriented hint keys under tip.hydrateDiag.hints.* */
  hintKeys: string[]
  /** Raw lines for toast / copy */
  lines: string[]
}

let lastDiagnosis: BoardHydrateDiagnosis | null = null

const preview = (raw: string | null | undefined, max = 96) => {
  if (!raw) {
    return ''
  }
  const oneLine = raw.replace(/\s+/g, ' ').trim()
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`
}

export const describeStorageError = (error: unknown) => {
  if (error instanceof DOMException) {
    return {
      name: error.name,
      message: error.message,
      code:
        error.name === 'QuotaExceededError'
          ? ('QUOTA_EXCEEDED' as const)
          : error.name === 'InvalidStateError' ||
              error.name === 'AbortError' ||
              /blocked|versionchange/i.test(error.message)
            ? ('IDB_BLOCKED' as const)
            : ('IDB_UNKNOWN' as const)
    }
  }
  if (error instanceof Error) {
    const msg = error.message || ''
    if (/quota/i.test(msg) || error.name === 'QuotaExceededError') {
      return {
        name: error.name,
        message: msg,
        code: 'QUOTA_EXCEEDED' as const
      }
    }
    if (/invalid file list/i.test(msg)) {
      return {
        name: error.name,
        message: msg,
        code: 'PRIMARY_INVALID_SHAPE' as const
      }
    }
    if (error instanceof SyntaxError || /JSON|Unexpected token/i.test(msg)) {
      return {
        name: error.name,
        message: msg,
        code: 'PRIMARY_INVALID_JSON' as const
      }
    }
    return { name: error.name, message: msg, code: 'IDB_UNKNOWN' as const }
  }
  return {
    name: 'Unknown',
    message: String(error),
    code: 'IDB_UNKNOWN' as const
  }
}

const hintKeysFor = (code: BoardHydrateCode): string[] => {
  switch (code) {
    case 'FORCE_FRESH':
      return ['tip.hydrateDiag.hints.forceFresh']
    case 'BACKUP_RESTORED':
      return ['tip.hydrateDiag.hints.backupRestored']
    case 'PRIMARY_INVALID_JSON':
    case 'PRIMARY_INVALID_SHAPE':
      return [
        'tip.hydrateDiag.hints.listCorrupt',
        'tip.hydrateDiag.hints.checkKeyvalStore'
      ]
    case 'BACKUP_INVALID':
    case 'IDB_BOTH_UNREADABLE':
      return [
        'tip.hydrateDiag.hints.listAndBackupGone',
        'tip.hydrateDiag.hints.checkKeyvalStore',
        'tip.hydrateDiag.hints.closeOtherTabs'
      ]
    case 'IDB_GET_PRIMARY_THROW':
    case 'IDB_GET_BACKUP_THROW':
    case 'IDB_UNKNOWN':
      return [
        'tip.hydrateDiag.hints.idbOpenFail',
        'tip.hydrateDiag.hints.checkKeyvalStore',
        'tip.hydrateDiag.hints.closeOtherTabs'
      ]
    case 'QUOTA_EXCEEDED':
      return ['tip.hydrateDiag.hints.quota']
    case 'IDB_BLOCKED':
      return [
        'tip.hydrateDiag.hints.blocked',
        'tip.hydrateDiag.hints.closeOtherTabs'
      ]
    case 'REHYDRATE_CALLBACK_ERROR':
      return ['tip.hydrateDiag.hints.rehydrate']
    case 'PERSIST_WRITE_FAIL':
      return [
        'tip.hydrateDiag.hints.persistFail',
        'tip.hydrateDiag.hints.quota'
      ]
    default:
      return ['tip.hydrateDiag.hints.checkKeyvalStore']
  }
}

const buildLines = (diag: Omit<BoardHydrateDiagnosis, 'lines' | 'hintKeys'>) => {
  const lines = [
    `code=${diag.code}`,
    `outcome=${diag.outcome}`,
    `phase=${diag.phase}`,
    `at=${diag.at}`
  ]
  if (diag.errorName || diag.errorMessage) {
    lines.push(`error=${diag.errorName || '?'}: ${diag.errorMessage || ''}`)
  }
  if (diag.primaryPresent !== undefined) {
    lines.push(
      `primaryPresent=${diag.primaryPresent} length=${diag.primaryLength ?? 0}`
    )
  }
  if (diag.primaryPreview) {
    lines.push(`primaryPreview=${diag.primaryPreview}`)
  }
  if (diag.backupPresent !== undefined) {
    lines.push(
      `backupPresent=${diag.backupPresent} length=${diag.backupLength ?? 0}`
    )
  }
  if (diag.backupPreview) {
    lines.push(`backupPreview=${diag.backupPreview}`)
  }
  lines.push('idbDatabase=keyval-store')
  lines.push('keys=PAINT-BOARD-FILES | PAINT-BOARD-FILES-BACKUP | paint-board-file:*')
  return lines
}

export const setBoardHydrateDiagnosis = (
  partial: Omit<BoardHydrateDiagnosis, 'lines' | 'hintKeys' | 'at'> & {
    at?: string
  }
) => {
  const base = {
    ...partial,
    at: partial.at ?? new Date().toISOString(),
    hintKeys: hintKeysFor(partial.code)
  }
  lastDiagnosis = {
    ...base,
    lines: buildLines(base)
  }
  if (partial.outcome !== 'ok') {
    const payload = {
      ...lastDiagnosis,
      tip: 'DevTools → Application → IndexedDB → keyval-store'
    }
    if (partial.outcome === 'backup') {
      console.warn('[paint-board] board hydrate diagnosis', payload)
    } else {
      console.error('[paint-board] board hydrate diagnosis', payload)
    }
  }
  return lastDiagnosis
}

export const getBoardHydrateDiagnosis = () => lastDiagnosis

export const clearBoardHydrateDiagnosis = () => {
  lastDiagnosis = null
}

export const formatBoardHydrateDiagnosisText = (
  diag: BoardHydrateDiagnosis | null = lastDiagnosis
) => (diag ? diag.lines.join('\n') : '')

export const snapshotRaw = (raw: string | null | undefined) => ({
  present: Boolean(raw),
  length: raw?.length ?? 0,
  preview: preview(raw)
})
