import { useEffect, useState } from 'react'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import { isMobile as isMobileFn } from '@/utils'

const isMobile = isMobileFn()

export type HelpSurface = 'touch' | 'pointer' | 'keyboard'

const readSurfaces = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { touch: false, pointer: true, keyboard: true }
  }
  const touch = window.matchMedia('(pointer: coarse)').matches
  const pointer =
    window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(hover: hover)').matches
  // Pure phones: gesture/dock help only. Desktop & hybrids: key/mouse help.
  return {
    touch,
    pointer,
    keyboard: pointer
  }
}

/** Which help slices to show for the current device. */
export const useHelpSurfaces = () => {
  const narrowPortrait = useNarrowPortrait()
  const [surfaces, setSurfaces] = useState(readSurfaces)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const coarse = window.matchMedia('(pointer: coarse)')
    const fine = window.matchMedia('(pointer: fine)')
    const hover = window.matchMedia('(hover: hover)')
    const sync = () => setSurfaces(readSurfaces())
    sync()
    coarse.addEventListener('change', sync)
    fine.addEventListener('change', sync)
    hover.addEventListener('change', sync)
    return () => {
      coarse.removeEventListener('change', sync)
      fine.removeEventListener('change', sync)
      hover.removeEventListener('change', sync)
    }
  }, [])

  const { touch: showTouch, pointer: showPointer, keyboard: showKeyboard } =
    surfaces

  return {
    showTouch,
    showPointer,
    showKeyboard,
    narrowPortrait,
    isMobile
  }
}

export const rowVisible = (
  surfaces: HelpSurface[],
  ctx: { showTouch: boolean; showPointer: boolean; showKeyboard: boolean }
) =>
  surfaces.some((s) => {
    if (s === 'touch') {
      return ctx.showTouch
    }
    if (s === 'pointer') {
      return ctx.showPointer
    }
    return ctx.showKeyboard
  })
