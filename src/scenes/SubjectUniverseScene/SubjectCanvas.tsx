import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Group, MathUtils, Mesh, Vector3 } from 'three'
import { useViewportQuality } from '../../hooks/useViewportQuality'
import { moleculeLinks, type MoleculeNode } from './molecule'
export interface MoleculeRotation { x: number; y: number; dragging: boolean; held: boolean }
interface Props { nodes: MoleculeNode[]; active: boolean; mode: string; rotation: RefObject<MoleculeRotation>; labels: RefObject<Map<string, HTMLElement>>; orbit: RefObject<HTMLDivElement | null>; invalidateRef: RefObject<() => void>; pick: (id: string) => void; back: () => void; dragged: RefObject<boolean>; onReady: (ready: boolean) => void; advance: (dt: number) => void }

function Cluster({ nodes, rotation, labels, orbit, invalidateRef, pick, dragged, reduced, advance }: Props & { reduced: boolean }) {
  const root = useRef<Group>(null), atoms = useRef<(Group | null)[]>([]), bonds = useRef<(Mesh | null)[]>([])
  const { camera, size, invalidate } = useThree()
  const links = useMemo(() => moleculeLinks(nodes), [nodes])
  const vectors = useMemo(() => nodes.map(() => new Vector3()), [nodes])
  const direction = useMemo(() => new Vector3(), []), midpoint = useMemo(() => new Vector3(), [])
  const screen = useMemo(() => new Vector3(), []), up = useMemo(() => new Vector3(0,1,0), [])
  const time = useRef(0), reveal = useRef(0)
  useEffect(() => { invalidateRef.current = invalidate; invalidate(); return () => { invalidateRef.current = () => {} } }, [invalidate, invalidateRef])
  useFrame((_, delta) => {
    if (!root.current) return
    const dt = Math.min(delta, .05)
    camera.position.set(0, 0, Math.max(10, 7.3 / (2 * Math.tan(20 * Math.PI / 180) * size.width / size.height)))
    if (!reduced) {
      time.current += dt
      if (!rotation.current.dragging && !rotation.current.held) advance(dt)
    }
    root.current.rotation.x = reduced ? rotation.current.x : MathUtils.damp(root.current.rotation.x, rotation.current.x, 8, dt)
    root.current.rotation.y = reduced ? rotation.current.y : MathUtils.damp(root.current.rotation.y, rotation.current.y, 8, dt)
    reveal.current = reduced ? 1 : MathUtils.damp(reveal.current, 1, 9, dt)
    root.current.scale.setScalar(reveal.current)
    atoms.current.forEach((atom, i) => {
      if (!atom) return
      const [x,y,z] = nodes[i].position
      const breath = reduced ? 0 : Math.sin(time.current * .8 + i * 1.3) * .025
      atom.position.set(x * (1 + breath), y * (1 + breath), z + breath)
      atom.scale.setScalar(nodes[i].radius * (1 + breath * .25))
    })
    links.forEach(([a,b], i) => {
      const bond = bonds.current[i], first = atoms.current[a], second = atoms.current[b]
      if (!bond || !first || !second) return
      direction.subVectors(second.position, first.position)
      midpoint.copy(first.position).add(second.position).multiplyScalar(.5)
      bond.position.copy(midpoint); bond.scale.set(1, direction.length(), 1)
      bond.quaternion.setFromUnitVectors(up, direction.normalize())
    })
    camera.updateMatrixWorld()
    root.current.updateWorldMatrix(true, true)
    atoms.current.forEach((atom, i) => atom?.getWorldPosition(vectors[i]))
    nodes.forEach((node, i) => {
      const label = labels.current.get(node.id)
      if (!label) return
      screen.copy(vectors[i]).project(camera)
      const distance = camera.position.z - vectors[i].z
      const diameter = node.radius * 2 / (2 * distance * Math.tan(20 * Math.PI / 180)) * size.height * reveal.current
      // Hide labels occluded by a nearer atom; keyboard focus restores the front view.
      const blocked = vectors.some((other, j) => j !== i && other.z > vectors[i].z + .3 && Math.hypot(other.x - vectors[i].x, other.y - vectors[i].y) < nodes[j].radius * .82)
      const focused = document.activeElement === label
      label.style.left = `${(screen.x + 1) * size.width / 2}px`
      label.style.top = `${(1 - screen.y) * size.height / 2}px`
      label.style.setProperty('--atom-size', `${diameter}px`)
      label.style.opacity = blocked && !focused ? '0' : String(reveal.current)
      label.style.pointerEvents = blocked && !focused ? 'none' : 'auto'
      label.style.zIndex = String(20 + Math.round(vectors[i].z * 4))
    })
    orbit.current?.setAttribute('data-rotation', `${root.current.rotation.x.toFixed(3)},${root.current.rotation.y.toFixed(3)}`)
    if (!reduced || reveal.current < .999 || Math.abs(root.current.rotation.x - rotation.current.x) + Math.abs(root.current.rotation.y - rotation.current.y) > .001) invalidate()
  })
  return <><ambientLight intensity={1.25} /><hemisphereLight args={['#fff8ec','#72658a',1.1]} /><directionalLight position={[-4,5,7]} intensity={3.5} /><directionalLight position={[5,-1,3]} intensity={1.1} />
    <group ref={root}>
      {links.map((_, i) => <mesh key={`bond-${i}`} ref={el => { bonds.current[i] = el }} raycast={() => {}}><cylinderGeometry args={[.17,.17,1,20]} /><meshStandardMaterial color="#ddcec1" roughness={.27} metalness={.15} /></mesh>)}
      {nodes.map((node, i) => <group key={node.id} ref={el => { atoms.current[i] = el }}><mesh onClick={event => { event.stopPropagation(); if (!dragged.current && !node.hub) pick(node.id) }}><sphereGeometry args={[1,48,32]} /><meshStandardMaterial color={node.color} roughness={.24} metalness={.12} /></mesh></group>)}
    </group>
  </>
}
export default function SubjectCanvas(props: Props) {
  const quality = useViewportQuality()
  const [lost, setLost] = useState(false)
  const visible = props.active && quality.tabVisible
  if (lost) return null
  return <Canvas frameloop={visible ? 'demand' : 'never'} dpr={[1,quality.maxDpr]} camera={{ position:[0,0,10], fov:40 }} gl={{ alpha:true, antialias:true, powerPreference:'low-power' }} onCreated={({ gl }) => {
    props.onReady(true)
    gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setLost(true); props.onReady(false) }, {once:true})
  }} onPointerMissed={() => { if (!props.dragged.current) props.back() }}>
    <Cluster {...props} key={props.mode} reduced={!quality.motionEnabled} />
  </Canvas>
}
