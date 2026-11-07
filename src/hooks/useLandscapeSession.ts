import { useSyncExternalStore } from 'react'
import {
  getLandscapeSession,
  subscribeLandscapeSession,
  type LandscapeSessionState
} from '@/utils/landscapeSession'

const getSnapshot = (): LandscapeSessionState => getLandscapeSession()

const getServerSnapshot = (): LandscapeSessionState => ({
  mode: 'idle',
  ownsFullscreen: false,
  hintKey: null
})

/** App-owned landscape session (lock/FS/canvas), not raw viewport geometry. */
export const useLandscapeSession = () => {
  const session = useSyncExternalStore(
    subscribeLandscapeSession,
    getSnapshot,
    getServerSnapshot
  )
  return {
    ...session,
    active: session.mode !== 'idle'
  }
}
