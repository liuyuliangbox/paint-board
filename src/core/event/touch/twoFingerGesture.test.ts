import { describe, expect, it } from 'vitest'
import { classifyTwoFingerGesture } from './twoFingerGesture'

describe('classifyTwoFingerGesture', () => {
  it('stays pending until a threshold is met', () => {
    expect(classifyTwoFingerGesture(0.02, 4)).toBe('pending')
  })

  it('locks pinch when scale changes first', () => {
    expect(classifyTwoFingerGesture(0.1, 2)).toBe('pinch')
  })

  it('locks drag when midpoint moves first', () => {
    expect(classifyTwoFingerGesture(0.02, 12)).toBe('drag')
  })

  it('picks the dominant signal when both cross', () => {
    expect(classifyTwoFingerGesture(0.2, 12)).toBe('pinch')
    expect(classifyTwoFingerGesture(0.09, 40)).toBe('drag')
  })
})
