import { useEffect, useState } from 'react'
import { isViewportLandscape } from '@/utils/screenOrientation'

/** Tracks whether the real viewport is landscape (after rotate / orientation.lock). */
export const useLandscapeLayout = () => {
  const [landscape, setLandscape] = useState(() => isViewportLandscape())

  useEffect(() => {
    const sync = () => setLandscape(isViewportLandscape())
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    const orientation = screen.orientation
    orientation?.addEventListener?.('change', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      orientation?.removeEventListener?.('change', sync)
    }
  }, [])

  return { landscape }
}
