import { useSyncExternalStore } from 'react'
import { useMediaQuery } from './useMediaQuery'
import { useReducedMotion } from './useReducedMotion'

// Match CSS: compact <768; medium 768–1023; desktop >=1024; wide >=1440; cinema >=1920.
export const breakpoints = { mobile: 390, medium: 768, desktop: 1024, wide: 1440, cinema: 1920 } as const
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}

export function useViewportQuality() {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const coarsePointer = useMediaQuery('(pointer: coarse)')
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true)
  const { reduced } = useReducedMotion()
  return {
    tier: desktop && !coarsePointer ? 'desktop' as const : 'compact' as const,
    maxDpr: desktop && !coarsePointer ? 1.75 : 1.25,
    pointerEnabled: desktop && !coarsePointer && !reduced && tabVisible,
    motionEnabled: !reduced && tabVisible,
    tabVisible,
  }
}
