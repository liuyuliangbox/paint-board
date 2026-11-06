import { useEffect, useState } from 'react'
import {
  isCoarsePointer,
  isNarrowViewport,
  shouldUseTouchUi
} from '@/utils/touchUi'

export const useTouchUi = () => {
  const [touchUi, setTouchUi] = useState(() => shouldUseTouchUi())
  const [coarse, setCoarse] = useState(() => isCoarsePointer())
  const [narrow, setNarrow] = useState(() => isNarrowViewport())

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const narrowQuery = window.matchMedia('(max-width: 767px)')
    const sync = () => {
      setCoarse(coarseQuery.matches)
      setNarrow(narrowQuery.matches)
      setTouchUi(coarseQuery.matches || narrowQuery.matches)
    }
    sync()
    coarseQuery.addEventListener('change', sync)
    narrowQuery.addEventListener('change', sync)
    return () => {
      coarseQuery.removeEventListener('change', sync)
      narrowQuery.removeEventListener('change', sync)
    }
  }, [])

  return { touchUi, coarse, narrow }
}
