import { useCallback, useContext } from 'react'
import { StoryMotionContext } from '../components/motion/StoryMotion'
import type { StoryId } from '../content/homepage'

// Read from a GSAP tick / R3F frame, not to render HTML. No per-frame React subscription.
export function useScrollProgress(id: StoryId) {
  const state = useContext(StoryMotionContext)
  if (!state) throw new Error('useScrollProgress must be inside StoryMotion')
  return useCallback(() => state.get(id)!, [state, id])
}
