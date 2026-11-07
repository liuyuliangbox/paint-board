/** Narrow phone portrait: long-edge left/right rails + overlay mutex. */
export const NARROW_PORTRAIT_MQ =
  '(max-width: 750px) and (orientation: portrait)'

/** True when the viewport is wider than tall (real window after rotate/lock). */
export const isViewportLandscape = (
  width = typeof window !== 'undefined' ? window.innerWidth : 0,
  height = typeof window !== 'undefined' ? window.innerHeight : 0
) => width > height

/**
 * Low-level viewport helpers live here.
 * Landscape lock / fullscreen / canvas restore are owned by
 * `utils/landscapeSession` — do not reintroduce ad-hoc enter/exit here.
 */
