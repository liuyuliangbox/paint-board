import { useEffect, useState } from 'react'

const PORTRAIT_XS = '(max-width: 750px) and (orientation: portrait)'

/** Phone portrait where left/right long-edge rails apply. */
export const useNarrowPortrait = () => {
  const [narrowPortrait, setNarrowPortrait] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(PORTRAIT_XS).matches
      : false
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const mq = window.matchMedia(PORTRAIT_XS)
    const sync = () => setNarrowPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrowPortrait
}
