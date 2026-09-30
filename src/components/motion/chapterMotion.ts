import { gsap, ScrollTrigger } from '../../utils/animation/gsap'
import type { SceneProgress } from './StoryMotion'
import { RESOURCE_EXIT_FROM, RESOURCE_TRAVEL_FROM, RESOURCE_TRAVEL_TO, WHITEBOARD_END, WHITEBOARD_SCROLL_UNIT } from './whiteboardTiming'

export function buildChapterMotion(section: HTMLElement, state: SceneProgress, reduced: boolean, compact: boolean) {
  const q = gsap.utils.selector(section)
  const id = section.id
  if (!['interactive', 'journey', 'reviews'].includes(id)) return false
  if (reduced || compact) return true
  const stage = section.querySelector<HTMLElement>(id === 'reviews' ? '.review-stage' : '.cinema-stage')!
  const durations: Record<string, number> = { interactive: WHITEBOARD_SCROLL_UNIT, journey: 4.6, reviews: 1.5 }
  const start = () => `top top+=${id === 'interactive' ? document.querySelector('header')!.getBoundingClientRect().height : 80}`
  if (id === 'interactive') ScrollTrigger.create({ id: 'whiteboard-pin', trigger: section, pin: stage, start, end: () => `+=${innerHeight * WHITEBOARD_SCROLL_UNIT * RESOURCE_EXIT_FROM}`, anticipatePin: 1, invalidateOnRefresh: true })
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    id: `chapter-${id}`, trigger: section, pin: id === 'interactive' ? false : stage, start, end: () => `+=${innerHeight * durations[id] * (id === 'interactive' ? WHITEBOARD_END : 1)}`, scrub: .45, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: trigger => { state.active = trigger.isActive; state.direction = trigger.direction },
  } })
  tl.to({}, { duration: id === 'interactive' ? WHITEBOARD_END : 1 }, 0)
  tl.eventCallback('onUpdate', () => {
    state.progress = tl.time()
    stage.dataset.progress = state.progress.toFixed(4)
    state.listeners.forEach(fn => fn())
  })
  if (id === 'interactive') {
    // Reveal the overlapping stage only at the portal handoff.
    tl.fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: .0001 }, 0)
    tl.fromTo(q('.blank-board'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .05 }, .45)
    tl.to(q('.board-world'), { autoAlpha: 0, duration: .02 }, .50)
    tl.fromTo(q('.blank-board > div'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .05 }, .52)
    tl.to(q('.blank-board > div'), { autoAlpha: 0, y: -30, duration: .05 }, .65)
    tl.fromTo(q('.resource-scene'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .05 }, .71)
    section.querySelectorAll<HTMLElement>('.resource-row').forEach((row, i) => {
      const right = row.dataset.direction === 'right'
      const overflow = () => Math.max(0, row.scrollWidth - innerWidth)
      const enter = [.724, .737, .748][i]
      const settle = [.810, .805, .820][i]
      // The camera and dotted ground stay fixed; only aligned rows translate.
      tl.fromTo(row, { x: () => right ? -row.scrollWidth : innerWidth }, {
        x: () => right ? -overflow() : 0, ease: 'sine.out', duration: settle - enter,
      }, enter)
      tl.to(row, { x: () => right ? 0 : -overflow(), duration: RESOURCE_TRAVEL_TO - RESOURCE_TRAVEL_FROM, ease: 'sine.inOut' }, RESOURCE_TRAVEL_FROM)
      tl.to(row, { x: () => right ? innerWidth : -row.scrollWidth, duration: WHITEBOARD_END - (RESOURCE_EXIT_FROM + i * .004), ease: 'sine.inOut' }, RESOURCE_EXIT_FROM + i * .004)
    })
    tl.to(q('.resource-scene, .scene-bottom'), { autoAlpha: 0, duration: .016 }, WHITEBOARD_END - .016)
  }
  if (id === 'journey') {
    tl.to(q('.journey-heading'), { autoAlpha: 0, y: -25, duration: .08 }, .06)
    const intervals = [[.05, .22], [.38, .58], [.74, 1]]
    intervals.forEach(([start, end], i) => {
      tl.fromTo(q(`.journey-stop--${i}`), { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: .06 }, start)
      if (i < 2) tl.to(q(`.journey-stop--${i}`), { autoAlpha: 0, x: -80, duration: .08 }, end)
    })
    tl.fromTo(q('.journey-progress'), { '--travel': '0%' }, { '--travel': '100%', duration: .9 }, .1)
  }
  if (id === 'reviews') {
    tl.to(q('.reviews-track'), { x: () => -Math.max(0, (section.querySelector('.reviews-track') as HTMLElement).scrollWidth - innerWidth + 144), duration: .8 }, .1)
  }
  return true
}
