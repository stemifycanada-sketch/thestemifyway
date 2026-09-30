import { gsap, ScrollTrigger } from '../../utils/animation/gsap'
import { beat, clamp01 } from '../../scenes/HeroChoiceScene/choreography'
import type { SceneProgress } from './StoryMotion'
import { INTRO_END, INTRO_SCROLL_UNIT, PORTAL_FROM, PORTAL_TO } from './introTiming'

export function buildIntroMotion(section: HTMLElement, state: SceneProgress, adaptive: SceneProgress, reduced: boolean, compact: boolean) {
  const stage = section.querySelector<HTMLElement>('.intro-stage')!
  const visual = section.querySelector<HTMLElement>('.intro-visual')!
  const cardsSection = section.querySelector<HTMLElement>('.intro-adaptive')!
  const q = gsap.utils.selector(section)
  const floorLeft = gsap.utils.interpolate('#fbdbc3', '#feeee3')
  const floorCenter = gsap.utils.interpolate('#ffe5d2', '#ffefe2')
  const floorRight = gsap.utils.interpolate('#fee2cd', '#ffefe3')
  const portalSky = gsap.utils.interpolate('#fee2cb', '#f9fafb')
  const portalFloor = gsap.utils.interpolate('#ffefe3', '#eeece7')
  const paint = () => {
    const filmProgress = clamp01((state.progress - .10) / .38)
    stage.style.setProperty('--intro-floor-left', floorLeft(filmProgress))
    stage.style.setProperty('--intro-floor-center', floorCenter(filmProgress))
    stage.style.setProperty('--intro-floor-right', floorRight(filmProgress))
    const portalReveal = beat((state.progress - PORTAL_FROM) / (PORTAL_TO - PORTAL_FROM), .77, 1)
    stage.style.setProperty('--portal-sky', portalSky(portalReveal))
    stage.style.setProperty('--portal-floor', portalFloor(portalReveal))
    cardsSection.dataset.cardHold = String(compact || (!reduced && state.progress > .565 && state.progress < .865))
    stage.dataset.progress = state.progress.toFixed(4)
    adaptive.progress = clamp01((state.progress - .5) / .5)
    adaptive.listeners.forEach(fn => fn())
    // The single static fallback also contains the accents beside the body.
    visual.style.setProperty('--object-fallback-opacity', String(1 - beat(state.progress, .045, .10)))
    state.listeners.forEach(fn => fn())
  }
  paint()
  if (reduced) return
  if (compact) {
    const update = (trigger: ScrollTrigger) => { state.progress = trigger.progress * .48; state.active = trigger.isActive; paint() }
    ScrollTrigger.create({ trigger: visual, start: 'top top+=220', end: 'bottom top+=220', onUpdate: update, onRefresh: update })
    const portal = section.querySelector<HTMLElement>('.intro-portal')!
    const title = gsap.timeline({ scrollTrigger: { trigger: portal, start: 'top 85%', end: 'bottom 20%', scrub: .25 } })
    title.fromTo(q('.portal-title-word'), { yPercent: 110 }, { yPercent: 0, duration: .08, stagger: .018, ease: 'power3.out' }, 0)
      .to(q('.portal-title'), { autoAlpha: 0, x: -8, y: -12, duration: .10 }, .18)
      .to({}, { duration: .72 })
    return
  }
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    id: 'intro-film', trigger: section, pin: stage, start: () => `top top+=${document.querySelector('header')!.getBoundingClientRect().height}`,
    end: () => `+=${innerHeight * INTRO_SCROLL_UNIT * INTRO_END}`, scrub: .4, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: trigger => { state.active = trigger.isActive; state.direction = trigger.direction },
  } })
  tl.to(state, { progress: INTRO_END, duration: INTRO_END, onUpdate: paint }, 0)
  tl.to(q('.hero-copy, .hero-baseline'), { autoAlpha: 0, y: -25, duration: .07 }, .12)
  tl.fromTo(q('.intro-adaptive'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .02 }, .24)
  tl.fromTo(q('.adaptive-heading > *'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .07, stagger: .014, ease: 'power2.out' }, .24)
  tl.fromTo(q('.intro-adaptive .scene-bottom'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .03 }, .565)
  tl.fromTo(q('.adapt-card'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: .045, stagger: .029, ease: 'power2.out' }, .565)
  tl.to(q('.adaptive-heading, .adapt-card, .intro-adaptive .scene-bottom'), { autoAlpha: 0, y: -30, duration: .04 }, .825)
  // The generated opening is slightly smaller than the previous shot. Register
  // the desk/laptop and stool before the cut; never blend two displaced children.
  tl.set(q('.intro-portal'), { autoAlpha: 1 }, PORTAL_FROM)
  tl.fromTo(q('.portal-film'), { scaleX: 1.014, scaleY: 1.033, xPercent: .1042, transformOrigin: '0% 0%' },
    { scaleX: 1, scaleY: 1, xPercent: 0, duration: .085, ease: 'sine.inOut' }, PORTAL_FROM)
  tl.fromTo(q('.portal-title-word'), { yPercent: 110 }, { yPercent: 0, duration: .035, stagger: .008, ease: 'power3.out' }, PORTAL_FROM + .004)
  tl.to(q('.portal-title'), { autoAlpha: 0, x: -32, y: -18, duration: .035, ease: 'power2.out' }, PORTAL_FROM + .070)
  // Preserve the full seated composition, then fill the stage after the child
  // leaves frame. The next chapter uses the identical final-frame crop.
  tl.fromTo(q('.intro-portal-frame'), { scale: 1 }, { scale: () => Math.max(1, stage.clientHeight / (stage.clientWidth * 9 / 16)), duration: .10, ease: 'sine.inOut' }, PORTAL_TO - .10)
}
