import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Quaternion, Vector3, Shape, Path, DoubleSide, CatmullRomCurve3 } from 'three'
import type { HeroWorldId } from '../../scenes/HeroChoiceScene/choreography'

type Point = [number, number, number]
const palette = { ink: '#343b42', orange: '#fd4304', cream: '#faf7e7', purple: '#8b70c3', teal: '#4eac95', yellow: '#f1be43', blue: '#5379c9', coral: '#e88272' }

function Ball({ at, radius = 0.13, color, detail = 32 }: { at: Point; radius?: number; color: string; detail?: number }) {
  return <mesh position={at} castShadow><sphereGeometry args={[radius, detail, detail / 2]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.2} /></mesh>
}

function Rod({ from, to, color = palette.ink, radius = 0.025 }: { from: Point; to: Point; color?: string; radius?: number }) {
  const { midpoint, rotation, length } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to), direction = b.clone().sub(a)
    return { midpoint: a.add(b).multiplyScalar(0.5), length: direction.length(), rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()) }
  }, [from, to])
  return <mesh position={midpoint} quaternion={rotation} castShadow><cylinderGeometry args={[radius, radius, length, 16]} /><meshStandardMaterial color={color} roughness={0.23} metalness={0.65} /></mesh>
}

function Block({ at = [0, 0, 0], size, color, rotation = [0, 0, 0] }: { at?: Point; size: Point; color: string; rotation?: Point }) {
  return <RoundedBox position={at} args={size} radius={Math.min(...size) * 0.14} smoothness={4} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.38} /></RoundedBox>
}

function Mathematics({ compact }: { compact: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(Array.from({ length: 20 }, (_, i) => {
    const x = -.58 + i / 19 * 1.22
    return new Vector3(x, (x + .58) ** 2 * .82 - .58, .12)
  })), [])
  return <group rotation={[-.12, -.16, .05]}>
    <group position={[-.2, .05, 0]}>
      <Block at={[0, 0, -.055]} size={[1.6, 1.6, .09]} color="#edece5" />
      {[-.6, -.3, 0, .3, .6].map(n => <group key={n}>
        <Rod from={[-.7, n, .005]} to={[.7, n, .005]} radius={.005} color="#bbbfb8" />
        <Rod from={[n, -.7, .005]} to={[n, .7, .005]} radius={.005} color="#bbbfb8" />
      </group>)}
      <Rod from={[-.72, -.6, .08]} to={[.8, -.6, .08]} radius={.021} />
      <Rod from={[-.6, -.72, .08]} to={[-.6, .85, .08]} radius={.021} />
      <mesh castShadow><tubeGeometry args={[curve, compact ? 24 : 48, .046, 12, false]} /><meshStandardMaterial color={palette.orange} roughness={.27} metalness={.12} /></mesh>
    </group>
    <mesh position={[1.03, .6, .55]} rotation={[.4, .6, .3]} castShadow><icosahedronGeometry args={[.47]} /><meshStandardMaterial color={palette.yellow} roughness={.28} metalness={.18} /></mesh>
    <group position={[.9, -.67, .55]} rotation={[Math.PI / 2 - .35, .05, -.25]}>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={i === 0 ? [.045, .09, .045] : [0, 0, 0]} rotation={[0, i * Math.PI / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[.46, .46, .16, 20, 1, false, .045, Math.PI / 2 - .09]} /><meshStandardMaterial color={i === 0 ? palette.orange : palette.cream} roughness={.35} /></mesh>)}
    </group>
  </group>
}

function Chemistry({ compact }: { compact: boolean }) {
  const atoms: Point[] = [[0, 0.32, 0], [-0.43, 0.63, 0.15], [0.44, 0.62, -0.14], [0.12, -0.2, 0.25]]
  return <group rotation={[0.1, 0.25, -0.06]}>
    <group position={[0.38, 0.25, 0]}>
      {atoms.slice(1).map((point, i) => <Rod key={i} from={atoms[0]} to={point} color="#c7c7c4" radius={0.055} />)}
      {atoms.map((point, i) => <Ball key={i} at={point} radius={i === 0 ? 0.26 : 0.2} color={i === 0 ? palette.purple : i === 3 ? palette.teal : palette.coral} detail={compact ? 12 : 24} />)}
    </group>
    <group position={[.95, -.47, .28]} rotation={[.08, .1, -.12]}>
      <mesh><cylinderGeometry args={[.28, .25, .65, 32, 1, true]} /><meshPhysicalMaterial color="#d7e8ed" transparent opacity={.26} roughness={.12} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, -.16, 0]}><cylinderGeometry args={[.24, .23, .3, 24]} /><meshStandardMaterial color="#d6a431" roughness={.25} /></mesh>
      <mesh position={[0, .33, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.28, .018, 8, 32]} /><meshStandardMaterial color="#afc2c7" metalness={.25} roughness={.2} /></mesh>
      {[-.1, .04, .18].map(y => <Rod key={y} from={[-.05, y, .27]} to={[.12, y, .27]} radius={.008} color="#52636b" />)}
    </group>
    {[-0.68, -0.31].map((x, i) => <group key={x} position={[x, -0.3 + i * 0.15, 0.2]} rotation={[0, 0, i ? -0.16 : 0.09]}>
      <mesh><cylinderGeometry args={[0.14, 0.14, 0.8, 18, 1, true]} /><meshPhysicalMaterial color="#d9e9e8" transparent opacity={0.32} roughness={0.18} metalness={0.08} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.11, 0.11, 0.42, 16]} /><meshStandardMaterial color={i ? palette.yellow : palette.teal} roughness={0.3} /></mesh>
      <Ball at={[0, -0.39, 0]} radius={0.14} color={i ? palette.yellow : palette.teal} />
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.145, 0.025, 8, 20]} /><meshStandardMaterial color="#b5cecd" roughness={0.3} /></mesh>
    </group>)}
  </group>
}

function Physics({ compact }: { compact: boolean }) {
  const count = compact ? 3 : 5
  return <group rotation={[0.12, -0.28, -0.07]}>
    <Block at={[0, -0.8, 0]} size={[1.8, 0.12, 0.8]} color="#d8d4c6" />
    {[-0.32, 0.32].map(z => <group key={z}>
      <Rod from={[-0.82, -0.74, z]} to={[-0.82, 0.65, z]} radius={0.035} />
      <Rod from={[0.82, -0.74, z]} to={[0.82, 0.65, z]} radius={0.035} />
      <Rod from={[-0.82, 0.65, z]} to={[0.82, 0.65, z]} radius={0.035} />
    </group>)}
    {Array.from({ length: count }, (_, i) => {
      const x = (i - (count - 1) / 2) * 0.28, end: Point = [x + (i === count - 1 ? 0.36 : 0), i === count - 1 ? -0.12 : -0.3, 0]
      return <group key={i}><Rod from={[x, 0.62, -0.3]} to={end} radius={0.01} /><Rod from={[x, 0.62, 0.3]} to={end} radius={0.01} /><Ball at={end} radius={0.145} color={i === count - 1 ? palette.orange : '#a8bacb'} detail={compact ? 12 : 24} /></group>
    })}
  </group>
}

function Biology({ compact }: { compact: boolean }) {
  const count = compact ? 9 : 14
  const curves = useMemo(() => [-1, 1].map(side => new CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => {
    const t = i / 63, angle = t * Math.PI * 2.5
    return new Vector3(side * Math.cos(angle) * .34, t * 1.95 - .975, side * Math.sin(angle) * .34)
  }))), [])
  return <group rotation={[.1, .2, -.18]}>
    {curves.map((curve, i) => <mesh key={i}><tubeGeometry args={[curve, compact ? 48 : 96, .058, 12, false]} /><meshPhysicalMaterial color={i ? '#d68b6a' : '#389983'} roughness={.22} metalness={.2} clearcoat={.4} /></mesh>)}
    {Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1), a = t * Math.PI * 2.5, x = Math.cos(a) * .34, z = Math.sin(a) * .34, y = t * 1.95 - .975
      return <group key={i}><Rod from={[x,y,z]} to={[0,y,0]} radius={.027} color={i % 2 ? '#e9c971' : '#718dbc'} /><Rod from={[0,y,0]} to={[-x,y,-z]} radius={.027} color={i % 2 ? '#718dbc' : '#e9c971'} /></group>
    })}
    <group position={[.78, -.45, .12]}><mesh><sphereGeometry args={[.38, 32, 24]} /><meshPhysicalMaterial color="#c2d9c7" roughness={.16} transparent opacity={.28} depthWrite={false} clearcoat={1} /></mesh><Ball at={[.04,.01,.04]} radius={.14} color={palette.purple} />{[[-.18,.12,.12],[.17,-.14,.15],[-.15,-.16,.1]].map((p,i) => <Ball key={i} at={p as Point} radius={.075} color={palette.teal} />)}</group>
  </group>
}

function Engineering() {
  return <group rotation={[0.2, -0.3, -0.06]}>
    <Block at={[0, -0.34, 0]} size={[2.3, 0.12, 0.72]} color="#dbbea0" />
    {[-0.31, 0.31].map(z => <group key={z}>
      <Rod from={[-1.1, -0.26, z]} to={[1.1, -0.26, z]} color={palette.orange} radius={0.04} />
      <Rod from={[-0.7, 0.5, z]} to={[0.7, 0.5, z]} color={palette.orange} radius={0.04} />
      {[-1.1, -0.37, 0.37].map((x, i) => <group key={x}><Rod from={[x, -0.26, z]} to={[x + 0.37, 0.5, z]} color={palette.orange} radius={0.035} /><Rod from={[x + 0.37, 0.5, z]} to={[x + 0.74, -0.26, z]} color={palette.orange} radius={0.035} /><Ball at={[x + 0.37, 0.5, z]} radius={0.053} color={i === 1 ? palette.ink : palette.orange} detail={12} /></group>)}
    </group>)}
    {[-0.8, 0.8].map(x => <Block key={x} at={[x, -0.57, 0]} size={[0.22, 0.4, 0.6]} color="#e7e2d7" />)}
  </group>
}

function Arts() {
  const shape = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.48, 0); s.bezierCurveTo(-0.6, 0.4, -0.1, 0.6, 0.25, 0.4); s.bezierCurveTo(0.6, 0.28, 0.6, -0.3, 0.24, -0.4); s.bezierCurveTo(-0.15, -0.55, -0.55, -0.3, -0.48, 0)
    const hole = new Path(); hole.absarc(0.2, 0.16, 0.1, 0, Math.PI * 2, true); s.holes.push(hole)
    return s
  }, [])
  return <group rotation={[-0.1, 0.2, 0.11]}>
    <Rod from={[-0.42, -0.9, 0.12]} to={[-0.12, 0.65, 0]} radius={0.035} color="#c29e70" />
    <Rod from={[0.42, -0.9, 0.12]} to={[0.12, 0.65, 0]} radius={0.035} color="#c29e70" />
    <Rod from={[0, -0.85, -0.4]} to={[0, 0.6, 0]} radius={0.035} color="#c29e70" />
    <Block at={[0, 0.15, 0]} size={[0.98, 1.05, 0.09]} color={palette.cream} />
    <mesh position={[-0.12, 0.25, 0.055]}><circleGeometry args={[0.26, 32]} /><meshStandardMaterial color={palette.coral} roughness={1} /></mesh>
    <mesh position={[0.1, 0.06, 0.065]} rotation={[0, 0, 0.3]}><planeGeometry args={[0.4, 0.45]} /><meshStandardMaterial color={palette.blue} roughness={1} /></mesh>
    <group position={[0.86, -0.52, 0.35]} rotation={[0.25, -0.3, -0.4]}>
      <mesh><extrudeGeometry args={[shape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, steps: 1 }]} /><meshStandardMaterial color="#dec5a0" roughness={0.65} /></mesh>
      {[palette.yellow, palette.coral, palette.blue, palette.teal].map((color, i) => <mesh key={color} position={[-0.3 + i * 0.14, -0.2, 0.08]} scale={[1, 0.8, 0.3]}><sphereGeometry args={[0.08, 14, 8]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>)}
      <Rod from={[-0.27, -0.62, 0.15]} to={[0.24, 0.6, 0.15]} color={palette.ink} radius={0.026} />
      <Rod from={[0.24, 0.6, 0.15]} to={[0.32, 0.8, 0.15]} color={palette.coral} radius={0.045} />
    </group>
  </group>
}

function Language() {
  return <group rotation={[-.38, -.15, -.22]}>
    {[-1, 1].map(side => <group key={side} position={[side * 0.41, 0, 0]} rotation={[0, side * -0.22, 0]}>
      <Block at={[0, 0, -0.05]} size={[0.84, 1.04, 0.12]} color={palette.purple} />
      <Block at={[0, 0.025, 0.045]} size={[0.77, 0.94, 0.1]} color={palette.cream} />
      {[.015, .04, .065, .09].map(z => <Rod key={z} from={[-.36, -.43, z]} to={[.36, -.43, z]} radius={.003} color="#bdb3a1" />)}
      {side === 1 && <Block at={[.21, -.35, .11]} size={[.11, .48, .008]} color={palette.orange} />}
      {[0.25, 0.07, -0.11, -0.29].map(y => <Rod key={y} from={[-0.25, y, 0.106]} to={[0.22, y, 0.106]} radius={0.008} color="#bcb4a8" />)}
    </group>)}
  </group>
}

export function LearningWorld({ id, compact }: { id: HeroWorldId; compact: boolean }) {
  switch (id) {
    case 'math': return <Mathematics compact={compact} />
    case 'chemistry': return <Chemistry compact={compact} />
    case 'physics': return <Physics compact={compact} />
    case 'biology': return <Biology compact={compact} />
    case 'engineering': return <Engineering />
    case 'arts': return <Arts />
    case 'language': return <Language />
  }
}
