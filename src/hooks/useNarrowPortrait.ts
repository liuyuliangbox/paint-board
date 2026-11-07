import { useEffect, useState } from 'react'
import { NARROW_PORTRAIT_MQ } from '@/utils/screenOrientation'

export { NARROW_PORTRAIT_MQ }

/** Phone portrait where left/right long-edge rails apply. */
export const useNarrowPortrait = () => {
  const [narrowPortrait, setNarrowPortrait] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(NARROW_PORTRAIT_MQ).matches
      : false
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const mq = window.matchMedia(NARROW_PORTRAIT_MQ)
    const sync = () => setNarrowPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrowPortrait
}
