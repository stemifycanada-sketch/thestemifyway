import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Group, Mesh, Vector2, Vector3, type Material } from 'three'
import { StoryMotionContext } from '../../components/motion/StoryMotion'
import { useViewportQuality } from '../../hooks/useViewportQuality'
import { HeroElement, type HeroElementId } from './HeroElement'
import { beat } from './choreography'

type Host = RefObject<HTMLDivElement | null>
// Coordinates are in the source film, keeping the objects beside the fingertip
// when its 16:9 plate is fitted to different viewport shapes.
const worlds: { id: HeroElementId; u: number; v: number; depth: number; scale: number; nearStudent?: boolean }[] = [
  { id: 'graph', u: .79, v: .28, scale: .72, depth: .9 },
  { id: 'flask', u: .705, v: .145, scale: .53, depth: .3 },
  { id: 'molecule', u: .814, v: .115, scale: .65, depth: .6 },
  { id: 'cradle', u: .904, v: .24, scale: .50, depth: .2 },
  { id: 'tube', u: .919, v: .43, scale: .53, depth: .45 },
  { id: 'prism', u: .704, v: .335, scale: .53, depth: .5 },
  { id: 'cube', u: .861, v: .56, scale: .65, depth: .7 },
  { id: 'dna', u: .924, v: .64, scale: .66, depth: .55 },
  { id: 'sphere', u: .828, v: .738, scale: .61, depth: .8 },
  { id: 'atom', u: .53, v: .13, scale: .60, depth: .35, nearStudent: true },
  { id: 'plus', u: .67, v: .455, scale: .51, depth: .3, nearStudent: true },
  { id: 'gear', u: .723, v: .797, scale: .65, depth: .4, nearStudent: true },
  { id: 'magnet', u: .625, v: .14, scale: .68, depth: .3, nearStudent: true },
]
// Fixed choreography is reversible: each object retraces the same path on scroll-up.
const departures = [
  { from: .085, to: .18, x: .35, y: .3, turn: -.14, depth: 5 },
  { from: .065, to: .15, x: -.1, y: 1.2, turn: -.3, depth: 2 },
  { from: .09, to: .18, x: .5, y: 1.1, turn: .35, depth: 3 },
  { from: .11, to: .20, x: 1.3, y: .5, turn: .17, depth: 2 },
  { from: .095, to: .185, x: 1.4, y: -.15, turn: .42, depth: 3 },
  { from: .05, to: .125, x: .08, y: .22, turn: -.5, depth: 5 },
  { from: .085, to: .18, x: 1, y: -.4, turn: -.4, depth: 4 },
  { from: .105, to: .195, x: 1.2, y: -.8, turn: .25, depth: 2 },
  { from: .07, to: .165, x: .35, y: -1.1, turn: -.3, depth: 4 },
  { from: .035, to: .09, x: -.12, y: .3, turn: -.2, depth: 4 },
  { from: .025, to: .08, x: .05, y: .08, turn: .4, depth: 6 },
  { from: .04, to: .095, x: .16, y: -.3, turn: .4, depth: 4 },
  { from: .045, to: .10, x: .05, y: .4, turn: -.25, depth: 3 },
]
function World({ pointerEnabled, active, host }: { pointerEnabled: boolean; active: boolean; host: Host }) {
  const state = useContext(StoryMotionContext)!.get('choice')!
  const { camera, invalidate, gl, size, viewport } = useThree()
  const objects = useRef<(Group | null)[]>([])
  const pointer = useMemo(() => ({ target: new Vector2(), current: new Vector2(), inside: false }), [])
  const projected = useMemo(() => new Vector3(), [])
  const materials = useRef<{ material: Material; opacity: number; index: number }[]>([])
  const clock = useRef(0)
  const { motionEnabled } = useViewportQuality()
  useEffect(() => {
    const element = host.current
    const notify = () => invalidate()
    state.listeners.add(notify)
    materials.current = []
    objects.current.forEach((object, index) => object?.traverse(node => {
      if (!(node instanceof Mesh)) return
      const list = Array.isArray(node.material) ? node.material : [node.material]
      list.forEach(material => { materials.current.push({ material, opacity: material.opacity, index }); material.transparent = true })
    }))
    invalidate()
    return () => { state.listeners.delete(notify); element?.removeAttribute('data-ready') }
  }, [state, invalidate, host])
  useEffect(() => {
    const element = host.current
    if (!element || !pointerEnabled) return
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect()
      pointer.target.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
      pointer.inside = true; invalidate()
    }
    const leave = () => { pointer.target.set(0, 0); pointer.inside = false; invalidate() }
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave)
    return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave) }
  }, [host, pointerEnabled, invalidate, pointer])
  useFrame((_, delta) => {
    const compactView = size.width < 1024
    const fades = departures.map(path => 1 - beat(state.progress, path.from, path.to))
    const opacity = Math.max(...fades)
    // Tight-gap accents leave before the video starts moving at progress .10.
    const accentOpacity = Math.max(...fades.filter((_, i) => worlds[i].nearStudent))
    const moving = motionEnabled && active && opacity > 0
    if (moving) { clock.current += Math.min(delta, .05); invalidate() }
    pointer.current.lerp(pointer.target, 1 - Math.exp(-Math.min(delta, .1) * 10))
    const px = pointerEnabled ? pointer.current.x : 0, py = pointerEnabled ? pointer.current.y : 0
    const plate = host.current?.querySelector('.intro-plate')?.getBoundingClientRect()
    const filmWidth = plate?.width ?? size.width, filmHeight = plate?.height ?? size.height
    const bounds = host.current?.getBoundingClientRect()
    const filmX = (plate?.left ?? 0) - (bounds?.left ?? 0) + filmWidth / 2 - size.width / 2
    const filmY = (plate?.top ?? 0) - (bounds?.top ?? 0) + filmHeight / 2 - size.height / 2
    const vw = viewport.width, vh = viewport.height
    let maximumMagnification = 1
    worlds.forEach((world, index) => {
      const object = objects.current[index]
      if (!object) return
      const u = compactView && world.id === 'dna' ? .89 : world.u
      const v = world.v
      const path = departures[index]
      const exit = beat(state.progress, path.from, path.to)
      const z = world.depth - exit * path.depth
      const ratio = (13 - z) / 13
      const breath = Math.sin(clock.current * .75 + index * .65)
      // Translation follows the pointer more clearly; perspective tilt and
      // proximity enlargement stay restrained so objects don't lunge forward.
      const parallax = .11 + world.depth * .09
      object.position.set(((u - .5) * filmWidth + filmX) / size.width * vw * ratio + px * parallax + exit * path.x,
        ((.5 - v) * filmHeight - filmY) / size.height * vh * ratio + py * parallax * .6 + breath * .035 + exit * path.y, z)
      projected.copy(object.position).project(camera)
      const distance = Math.hypot(projected.x - px, projected.y - py)
      const field = pointerEnabled && pointer.inside ? Math.max(0, 1 - distance / .28) : 0
      const magnification = 1 + field * field * .018
      maximumMagnification = Math.max(maximumMagnification, magnification)
      const scale = world.scale * filmHeight / size.height * ratio * magnification * (1 + breath * .012) * (1 - exit * .65)
      object.scale.setScalar(scale)
      object.rotation.set(Math.sin(clock.current * .3 + index) * .012, (index % 2 ? .10 : -.08) + px * .025 + Math.sin(clock.current * .35 + index) * .012, breath * .006 + exit * path.turn)
      object.visible = fades[index] > .001 && (!compactView || [0, 1, 2, 7, 9, 10, 11, 12].includes(index))
    })
    materials.current.forEach(({ material, opacity: initial, index }) => { material.opacity = initial * fades[index] })
    if (host.current) {
      host.current.setAttribute('data-ready', 'true')
      host.current.setAttribute('data-magnification', maximumMagnification.toFixed(4))
      host.current.setAttribute('data-frames', String(Number(host.current.dataset.frames ?? 0) + 1))
      host.current.setAttribute('data-objects-opacity', opacity.toFixed(4))
      host.current.setAttribute('data-accent-opacity', accentOpacity.toFixed(4))
      host.current.setAttribute('data-breath', clock.current.toFixed(3))
    }
    gl.domElement.setAttribute('aria-hidden', 'true')
  })
  return <>
    {worlds.map((world, index) => <group key={world.id} ref={node => { objects.current[index] = node }}>
      <HeroElement id={world.id} />
    </group>)}
  </>
}
export default function HeroCanvas({ active, host }: { active: boolean; host: Host }) {
  const quality = useViewportQuality()
  const [lost, setLost] = useState(false)
  if (lost) return null
  return <div className="hero-canvas" aria-hidden="true" data-active={active && quality.tabVisible}><Canvas dpr={[1, quality.maxDpr]} frameloop={active && quality.tabVisible ? 'demand' : 'never'}
    camera={{ position: [0, 0, 13], fov: 34, near: .1, far: 70 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: import.meta.env.DEV && new URLSearchParams(location.search).has('capture-objects') }}
    onCreated={({ gl }) => { gl.setClearAlpha(0); gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); host.current?.removeAttribute('data-ready'); setLost(true) }, { once: true }) }}
  ><Suspense fallback={null}><World pointerEnabled={quality.pointerEnabled} active={active} host={host} /></Suspense></Canvas></div>
}
