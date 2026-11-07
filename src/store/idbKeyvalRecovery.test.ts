import { describe, expect, it } from 'vitest'
import { isIdbInternalError } from './idbKeyvalRecovery'

describe('isIdbInternalError', () => {
  it('detects Chromium UnknownError Internal error', () => {
    expect(
      isIdbInternalError(new DOMException('Internal error.', 'UnknownError'))
    ).toBe(true)
    expect(isIdbInternalError(new Error('Internal error'))).toBe(true)
    expect(isIdbInternalError(new Error('quota exceeded'))).toBe(false)
  })
})
