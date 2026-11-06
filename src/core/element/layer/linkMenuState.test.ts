import { describe, expect, it } from 'vitest'
import { getLinkMenuState } from './linkMenuState'

const obj = (linkId?: string) =>
  ({
    visible: true,
    _paintLinkId: linkId
  } as any)

describe('getLinkMenuState', () => {
  it('allows link for two or more objects', () => {
    expect(getLinkMenuState([obj(), obj()]).canLink).toBe(true)
    expect(getLinkMenuState([obj()]).canLink).toBe(false)
  })

  it('offers unlink when any selected object is linked', () => {
    const state = getLinkMenuState([obj('a'), obj()])
    expect(state.canUnlink).toBe(true)
    expect(state.unlinkLabelKey).toBe('objectList.unlinkAll')
  })

  it('uses single-group unlink label when all share one link', () => {
    const state = getLinkMenuState([obj('a'), obj('a')])
    expect(state.canUnlink).toBe(true)
    expect(state.unlinkLabelKey).toBe('objectList.unlink')
  })
})
