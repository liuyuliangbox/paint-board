import { describe, expect, it } from 'vitest'
import { getLinkMenuState } from './linkMenuState'

const obj = (linkId?: string) =>
  ({
    visible: true,
    _paintLinkId: linkId
  } as any)

describe('getLinkMenuState', () => {
  it('allows link for two or more unlinked objects', () => {
    expect(getLinkMenuState([obj(), obj()]).canLink).toBe(true)
    expect(getLinkMenuState([obj()]).canLink).toBe(false)
  })

  it('hides link when selection is already one complete link group', () => {
    const state = getLinkMenuState([obj('a'), obj('a')])
    expect(state.canLink).toBe(false)
    expect(state.canUnlink).toBe(true)
    expect(state.unlinkLabelKey).toBe('objectList.unlink')
  })

  it('keeps link+unlink for mixed or multi-group selections', () => {
    const mixed = getLinkMenuState([obj('a'), obj()])
    expect(mixed.canLink).toBe(true)
    expect(mixed.canUnlink).toBe(true)
    expect(mixed.unlinkLabelKey).toBe('objectList.unlinkAll')

    const multi = getLinkMenuState([obj('a'), obj('b')])
    expect(multi.canLink).toBe(true)
    expect(multi.canUnlink).toBe(true)
    expect(multi.unlinkLabelKey).toBe('objectList.unlinkAll')
  })
})
