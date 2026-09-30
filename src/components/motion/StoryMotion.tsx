import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { prefetchSceneImages } from '../../assets/loaders'
import { storyOrder, type StoryId } from '../../content/homepage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { ScrollTrigger, useGSAP } from '../../utils/animation/gsap'
import { buildChapterMotion } from './chapterMotion'
import { buildIntroMotion } from './introMotion'
import { INTRO_END } from './introTiming'
import { WHITEBOARD_END, WHITEBOARD_RESOURCES } from './whiteboardTiming'

export interface SceneProgress { progress: number; active: boolean; direction: number; listeners: Set<() => void> }
type StoryState = Map<StoryId, SceneProgress>
export const StoryMotionContext = createContext<StoryState | null>(null)

export function StoryMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null)
  const { reduced } = useReducedMotion()
  const compact = useMediaQuery('(max-width: 1023px)')
  const state = useMemo<StoryState>(() => new Map(storyOrder.map(id => [id, { progress: 0, active: false, direction: 1, listeners: new Set() }])), [])
  useEffect(() => {
    const controller = new AbortController()
    const prefetched = new Set<string>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const next = storyOrder[storyOrder.indexOf(entry.target.id as StoryId) + 1]
        if (next && !prefetched.has(next)) { prefetched.add(next); void prefetchSceneImages(next, controller.signal) }
      })
    }, { rootMargin: '15% 0px' })
    scope.current?.querySelectorAll('[data-story-section]').forEach(section => observer.observe(section))
    return () => { controller.abort(); observer.disconnect() }
  }, [])
  useGSAP(() => {
    state.forEach(value => { value.progress = 0; value.active = false; value.direction = 1; value.listeners.forEach(notify => notify()) })
    const sections = scope.current?.querySelectorAll<HTMLElement>('[data-story-section]') ?? []
    sections.forEach(section => {
      const value = state.get(section.id as StoryId)!
      if (section.id === 'adaptive' && section.closest('.intro-sequence')) return
      if (section.id === 'choice') {
        buildIntroMotion(section, value, state.get('adaptive')!, reduced, compact)
        return
      }
      if (buildChapterMotion(section, value, reduced, compact)) return
      if (reduced) return
      const update = (trigger: ScrollTrigger) => {
        value.progress = trigger.progress; value.active = trigger.isActive; value.direction = trigger.direction
        value.listeners.forEach(notify => notify())
      }
      const trigger = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: update })
      update(trigger)
    })
  }, { scope, dependencies: [reduced, compact, state], revertOnUpdate: true })
  useEffect(() => {
    const navigate = () => {
      if (reduced || compact) return
      const adaptive = location.hash === '#adaptive'
      const interactive = location.hash === '#interactive'
      if (!adaptive && !interactive && location.hash !== '#learning-resources') return
      const trigger = ScrollTrigger.getById(adaptive ? 'intro-film' : 'chapter-interactive')
      if (trigger) {
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * (adaptive ? .525 / INTRO_END : interactive ? .001 / WHITEBOARD_END : WHITEBOARD_RESOURCES / WHITEBOARD_END), behavior: 'instant' })
        ScrollTrigger.update()
        trigger.getTween()?.progress(1)
        // A direct seek can render GSAP with callbacks suppressed. Publish the settled state.
        if (!adaptive) trigger.animation?.eventCallback('onUpdate')?.()
      }
    }
    const click = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href="#adaptive"], a[href="#interactive"], a[href="#learning-resources"]')
      if (!anchor || reduced || compact || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      history.pushState(null, '', anchor.hash)
      navigate()
      document.querySelector<HTMLElement>(anchor.hash)?.focus({ preventScroll: true })
    }
    document.addEventListener('click', click)
    window.addEventListener('hashchange', navigate)
    // Direct links must wait for GSAP's layout refresh, including poster load.
    ScrollTrigger.addEventListener('refresh', navigate)
    navigate()
    return () => { document.removeEventListener('click', click); window.removeEventListener('hashchange', navigate); ScrollTrigger.removeEventListener('refresh', navigate) }
  }, [reduced, compact])
  return <StoryMotionContext.Provider value={state}><div ref={scope}>{children}</div></StoryMotionContext.Provider>
}
