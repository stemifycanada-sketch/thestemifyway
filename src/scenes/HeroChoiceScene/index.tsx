import { lazy, Suspense, useRef, useState, useEffect } from 'react'
import { useInView } from '../../hooks/useInView'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { ScrollFilm } from '../../components/ui/ScrollFilm'
import { SceneBoundary } from '../../components/ui/SceneBoundary'
const HeroCanvas = lazy(() => import('./HeroCanvas'))
export function HeroChoiceScene() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useInView(ref)
  const { reduced } = useReducedMotion()
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!active || reduced) return
    const timer = window.setTimeout(() => setLoaded(true), 50)
    return () => window.clearTimeout(timer)
  }, [active, reduced])
  return <div className="hero-visual intro-visual" ref={ref}>
    <div className="intro-plate"><div className="intro-camera">
      <ScrollFilm scene="choice" src="/thestemifyway/assets/cinema/orange-sitting-1080p-60fps.mp4" poster="/thestemifyway/assets/cinema/orange-sitting-1080p-start.webp" label="A student in blue, seen from behind in a warm orange studio, lowers his raised hand and sits at his desk. An online math class with teacher and student tiles is already playing on his laptop as he picks up the stylus." from={.10} to={.48} className="intro-film" useSceneOnCompact fps={60} />
    </div></div>
    <div className="intro-object-fallback" aria-hidden="true"><picture><source media="(max-width: 600px)" srcSet="/thestemifyway/assets/hero/intro-objects-390.webp" /><source media="(max-width: 1023px)" srcSet="/thestemifyway/assets/hero/intro-objects-768.webp" /><img src="/thestemifyway/assets/hero/intro-objects-1440.webp" alt="" /></picture></div>
    <p className="sr-only">Dimensional graphs, glass chemistry tools, molecules, a pendulum and DNA surround the student's raised hand. Scroll to follow him into his learning space.</p>
    {loaded && !reduced && <SceneBoundary><Suspense fallback={null}><HeroCanvas active={active} host={ref} /></Suspense></SceneBoundary>}
  </div>
}
