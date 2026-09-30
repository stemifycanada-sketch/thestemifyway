import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { useViewportQuality } from '../../hooks/useViewportQuality'

export function journeyTravel(p: number) {
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t) }
  return smooth((p - .22) / .16) + smooth((p - .58) / .16)
}
function Rocket() {
  return <group rotation={[0, 0, -Math.PI / 2]} scale={.62}>
    <mesh><capsuleGeometry args={[.3, 1.1, 8, 24]} /><meshStandardMaterial color="#f45624" roughness={.33} metalness={.18} /></mesh>
    <mesh position={[0, .87, 0]}><coneGeometry args={[.3, .5, 24]} /><meshStandardMaterial color="#fff4d8" roughness={.5} /></mesh>
    <mesh position={[0, .18, .29]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.17, .17, .07, 24]} /><meshStandardMaterial color="#242a30" metalness={.5} roughness={.3} /></mesh>
    <mesh position={[0, .18, .34]}><sphereGeometry args={[.12, 20, 12]} /><meshStandardMaterial color="#add8e4" roughness={.18} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * .33, -.51, 0]} rotation={[0, 0, side * -.4]}><boxGeometry args={[.12, .57, .45]} /><meshStandardMaterial color="#df4018" roughness={.4} /></mesh>)}
    <mesh position={[0, -1, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.15, .55, 16]} /><meshBasicMaterial color="#ffcf73" /></mesh>
  </group>
}
function Planet({ color, index }: { color: string; index: number }) {
  return <group rotation={[.2, -.3, -.2]}>
    <mesh><sphereGeometry args={[1.4, 56, 40]} /><meshStandardMaterial color={color} roughness={.68} metalness={.08} /></mesh>
    <mesh rotation={[1.2, .25, 0]}><torusGeometry args={[1.9, .026, 8, 100]} /><meshStandardMaterial color={index === 0 ? '#cedecd' : '#d6cec0'} roughness={.4} /></mesh>
    <mesh rotation={[1.2, .25, 0]}><torusGeometry args={[2.08, .01, 8, 100]} /><meshStandardMaterial color="#a9b5b0" transparent opacity={.5} /></mesh>
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 1.12, Math.sin(i * 2.4) * .92, .85]} rotation={[i * .1, i * .25, i]}><icosahedronGeometry args={[.07 + i % 3 * .04, 0]} /><meshStandardMaterial color={index === 0 ? '#93b997' : index === 1 ? '#a6bce6' : '#e8b28b'} roughness={.8} /></mesh>)}
  </group>
}
function World() {
  const planets = useRef<Group>(null), rocket = useRef<Group>(null)
  const getProgress = useScrollProgress('journey')
  const { invalidate, camera, size } = useThree()
  useEffect(() => { const state = getProgress(); state.listeners.add(invalidate); return () => { state.listeners.delete(invalidate) } }, [getProgress, invalidate])
  useFrame(() => {
    const p = getProgress().progress, travel = journeyTravel(p)
    const aspect = size.width / size.height
    camera.position.set(0, 0, aspect < 1.2 ? 14 : 10)
    if (planets.current) planets.current.position.x = -travel * 12
    if (rocket.current) { rocket.current.position.set(-3.7 + p * 5, -1.3 + Math.sin(p * Math.PI * 3) * .45, 2); rocket.current.rotation.z = Math.cos(p * Math.PI * 3) * .1 }
  })
  return <><ambientLight intensity={.6} /><directionalLight position={[-6, 8, 8]} intensity={3} /><directionalLight position={[5, -2, -5]} intensity={1} color="#7594ba" />
    <group ref={planets}>{['#5c8775', '#4d6f9f', '#b16d47'].map((color, index) => <group key={color} position={[2.4 + index * 12, .8, 0]}><Planet color={color} index={index} /></group>)}</group>
    <group ref={rocket}><Rocket /></group>
    {Array.from({ length: 70 }, (_, i) => <mesh key={i} position={[Math.sin(i * 78.2) * 16, Math.cos(i * 27.8) * 9, -3 - i % 5]}><sphereGeometry args={[i % 6 === 0 ? .023 : .009, 6, 6]} /><meshBasicMaterial color="#b6c7ca" /></mesh>)}
  </>
}
export default function JourneyCanvas({ active }: { active: boolean }) {
  const quality = useViewportQuality()
  return <Canvas frameloop={active && quality.tabVisible ? 'demand' : 'never'} dpr={[1, quality.maxDpr]} camera={{ position: [0, 0, 10], fov: 45 }} gl={{ alpha: true, antialias: true }}><World /></Canvas>
}
