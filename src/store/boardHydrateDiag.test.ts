import { describe, expect, it } from 'vitest'
import {
  clearBoardHydrateDiagnosis,
  describeStorageError,
  formatBoardHydrateDiagnosisText,
  getBoardHydrateDiagnosis,
  setBoardHydrateDiagnosis
} from './boardHydrateDiag'

describe('boardHydrateDiag', () => {
  it('classifies JSON and quota errors', () => {
    expect(describeStorageError(new SyntaxError('Unexpected token')).code).toBe(
      'PRIMARY_INVALID_JSON'
    )
    expect(
      describeStorageError(new DOMException('quota', 'QuotaExceededError')).code
    ).toBe('QUOTA_EXCEEDED')
    expect(describeStorageError(new Error('invalid file list')).code).toBe(
      'PRIMARY_INVALID_SHAPE'
    )
  })

  it('stores a copyable diagnosis dump', () => {
    clearBoardHydrateDiagnosis()
    setBoardHydrateDiagnosis({
      code: 'PRIMARY_INVALID_JSON',
      outcome: 'soft_blank',
      phase: 'read_primary',
      errorName: 'SyntaxError',
      errorMessage: 'Unexpected token',
      primaryPresent: true,
      primaryLength: 12,
      primaryPreview: '{not-json',
      backupPresent: false
    })
    const text = formatBoardHydrateDiagnosisText(getBoardHydrateDiagnosis())
    expect(text).toContain('code=PRIMARY_INVALID_JSON')
    expect(text).toContain('primaryPreview={not-json')
    expect(text).toContain('idbDatabase=keyval-store')
  })
})
