import { SceneBoundary } from '../../components/ui/SceneBoundary'
import { lazy, Suspense, useRef } from 'react'
import { useInView } from '../../hooks/useInView'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
const JourneyCanvas = lazy(() => import('./JourneyCanvas'))
export function LearningJourneyScene() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useInView(ref, '20% 0px')
  const { reduced } = useReducedMotion()
  const compact = useMediaQuery('(max-width: 1023px)')
  return <div className="journey-world" ref={ref} aria-hidden="true">{reduced || compact ? <div className="static-planets"><i /><i /><i /><svg className="static-rocket" viewBox="0 0 180 80"><defs><linearGradient id="rocketPaint" x2="0" y2="1"><stop stopColor="#ffb473"/><stop offset=".45" stopColor="#fd5a20"/><stop offset="1" stopColor="#a83213"/></linearGradient></defs><path d="M34 32 5 40l29 8" fill="#f2c96e"/><path d="m49 27 13-20 34 18m-47 28 13 20 34-18" fill="#c8411d"/><path d="M38 24h74q23 0 49 16-26 16-49 16H38q-13-16 0-32" fill="url(#rocketPaint)"/><path d="m128 27 33 13-33 13" fill="#ece3c9"/><circle cx="94" cy="40" r="11" fill="#233b40"/><circle cx="94" cy="40" r="7" fill="#b5dbe1"/></svg></div> : active && <SceneBoundary fallback={<div className="static-planets"><i /><i /><i /></div>}><Suspense fallback={<div className="static-planets"><i /><i /><i /></div>}><JourneyCanvas active={active} /></Suspense></SceneBoundary>}</div>
}
