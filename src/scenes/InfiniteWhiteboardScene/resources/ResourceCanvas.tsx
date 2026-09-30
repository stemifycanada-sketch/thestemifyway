import { lazy, Suspense, useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { useInView } from '../../../hooks/useInView'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { useScrollProgress } from '../../../hooks/useScrollProgress'
import { ScrollTrigger } from '../../../utils/animation/gsap'
import { RESOURCE_TRAVEL_FROM, RESOURCE_TRAVEL_TO, WHITEBOARD_END } from '../../../components/motion/whiteboardTiming'
import { BalanceLab, BlocksLab, FractionLab, GeometryLab, GraphLab, QuizLab, WorkedLab } from './MathLabs'
import { CircuitLab, PendulumLab, RobotLab, WaveLab } from './MotionLabs'
import { LabActivity, LabDemo, Slider, useLoopValue } from './LabPrimitives'
import { ResourceVideo } from './ResourceVideo'
const FoldingCube = lazy(() => import('./FoldingCube'))

function CubeLab() {
  const [amount, setAmount] = useLoopValue(35, { min: 0, max: 100, period: 14 })
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref)
  return <><div className="lab-visual cube-lab" ref={ref} role="img" aria-label={`Six square faces, ${amount} percent folded into a cube`}>{visible && <Suspense fallback={<span className="cube-fallback">Six connected squares</span>}><FoldingCube amount={amount} /></Suspense>}</div><Slider label="Fold the cube" min={0} max={100} value={amount} display={`${amount}%`} onChange={setAmount} /></>
}
function Tile({ title, tone, children, sceneActive, video = false }: { title: string; tone: string; children: ReactNode; sceneActive: boolean; video?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const visible = useInView(ref)
  const { reduced } = useReducedMotion()
  const [manual, setManual] = useState(false)
  const automaticFlag = useRef(true)
  const active = visible && sceneActive
  const automatic = !manual && !reduced
  const takeControl = () => { automaticFlag.current = false; setManual(true) }
  const resume = () => { automaticFlag.current = true; setManual(false) }
  const captureControl = (event: { target: EventTarget }) => {
    if (event.target instanceof Element && event.target.closest('input, button:not([data-play-control]):not([data-resume-loop])')) takeControl()
  }
  return <article ref={ref} className={`learning-tile tone-${tone}${video ? ' learning-tile--video' : ''}`} aria-label={title} data-active={active} data-demo={automatic ? 'auto' : 'manual'} onPointerDownCapture={captureControl} onFocusCapture={captureControl}>
    <div className="lab-title"><h4>{title}</h4>{manual && !reduced && !video && <button className="lab-resume" data-resume-loop aria-label={`Resume ${title.toLowerCase()} loop`} onClick={resume}>Resume loop</button>}</div>
    <LabActivity.Provider value={active}><LabDemo.Provider value={{ automatic, takeControl, isAutomatic: () => automaticFlag.current && !reduced }}>{children}</LabDemo.Provider></LabActivity.Provider>
  </article>
}
const rows = [
  [
    { title: 'Try an idea', tone: 'lilac', component: <QuizLab /> },
    { title: 'Pendulum lab', tone: 'sky', component: <PendulumLab /> },
    { title: 'Fraction pieces', tone: 'cream', component: <FractionLab /> },
    { title: 'Molecular motion', tone: 'mint', component: <ResourceVideo name="molecular-motion" title="Molecular motion" description="An orange core and four blue spheres rock gently as one connected molecular model." />, video: true },
    { title: 'Flat to solid', tone: 'lilac', component: <CubeLab /> },
  ],
  [
    { title: 'Keep it balanced', tone: 'lilac', component: <BalanceLab /> },
    { title: 'A story opens', tone: 'cream', component: <ResourceVideo name="a-story-opens" title="A story opens" description="An orange pop-up book with blue paper hills and a mint tree; its sun-illustrated page lifts and settles." />, video: true },
    { title: 'Make a wave', tone: 'sky', component: <WaveLab /> },
    { title: 'A different angle', tone: 'mint', component: <GeometryLab /> },
    { title: 'Build a number', tone: 'cream', component: <BlocksLab /> },
  ],
  [
    { title: 'Every step matters', tone: 'cream', component: <WorkedLab /> },
    { title: 'Give it a sequence', tone: 'lilac', component: <RobotLab /> },
    { title: 'Complete the circuit', tone: 'sky', component: <CircuitLab /> },
    { title: 'Look closer', tone: 'mint', component: <ResourceVideo name="look-closer" title="Look closer" description="A blue and orange magnifying glass glides along the veins of a dimensional green leaf." />, video: true },
    { title: 'Shape a graph', tone: 'lilac', component: <GraphLab /> },
  ],
]

export function ResourceCanvas() {
  const { reduced } = useReducedMotion()
  const compact = useMediaQuery('(max-width: 1023px)')
  const progress = useScrollProgress('interactive')
  const [sceneActive, setSceneActive] = useState(false)
  useEffect(() => {
    let current = false
    const update = () => {
      const p = progress().progress
      const active = !document.hidden && (compact || reduced || (p > .71 && p < WHITEBOARD_END))
      if (current !== active) { current = active; setSceneActive(active) }
    }
    const state = progress(); state.listeners.add(update)
    document.addEventListener('visibilitychange', update); update()
    return () => { state.listeners.delete(update); document.removeEventListener('visibilitychange', update) }
  }, [progress, reduced, compact])
  const revealFocusedCard = (event: FocusEvent<HTMLDivElement>) => {
    const card = event.target.closest<HTMLElement>('.learning-tile')
    const row = card?.parentElement
    if (!card || !row) return
    const rect = card.getBoundingClientRect()
    if (rect.left >= 0 && rect.right <= innerWidth) return
    if (compact || reduced) { card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }); return }
    const trigger = ScrollTrigger.getById('chapter-interactive')
    if (!trigger) return
    const overflow = Math.max(1, row.scrollWidth - innerWidth)
    const targetX = Math.max(-overflow, Math.min(0, innerWidth / 2 - card.offsetLeft - card.offsetWidth / 2))
    const fraction = row.dataset.direction === 'right' ? 1 + targetX / overflow : -targetX / overflow
    // Inverse of sine.inOut used by the master scroll timeline.
    const t = Math.acos(1 - 2 * Math.max(0, Math.min(1, fraction))) / Math.PI
    const p = RESOURCE_TRAVEL_FROM + (RESOURCE_TRAVEL_TO - RESOURCE_TRAVEL_FROM) * t
    scrollTo({ top: trigger.start + (trigger.end - trigger.start) * p / WHITEBOARD_END, behavior: 'instant' })
    ScrollTrigger.update(); trigger.getTween()?.progress(1); trigger.animation?.eventCallback('onUpdate')?.()
  }
  return <div className="resource-window resource-rows" data-phase="resources" onFocusCapture={revealFocusedCard}>{rows.map((cards, i) => <div className="resource-lane" key={i} role="group" aria-label={`Learning activities row ${i + 1}`}><div className="resource-row" data-direction={i === 1 ? 'left' : 'right'}>{cards.map(card => <Tile key={card.title} title={card.title} tone={card.tone} video={card.video} sceneActive={sceneActive}>{card.component}</Tile>)}</div></div>)}</div>
}
