import { Canvas, useThree } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { OrthographicCamera } from '@react-three/drei'
import type { ReactNode } from 'react'

function FitCamera() {
  const height = useThree(state => state.size.height)
  return <OrthographicCamera makeDefault position={[0, 0, 8]} zoom={Math.max(12, height / 4.5)} near={.1} far={30} />
}
function Face({ color, position = [0, 0, 0] }: { color: string; position?: [number, number, number] }) {
  return <mesh position={position}><boxGeometry args={[.96, .96, .045]} /><meshStandardMaterial color={color} roughness={.34} metalness={.08} side={DoubleSide} /></mesh>
}
function Hinge({ children, position, rotation }: { children: ReactNode; position: [number, number, number]; rotation: [number, number, number] }) {
  return <group position={position} rotation={rotation}>{children}</group>
}
// Six connected square faces: an orthographic camera looks directly down at the net.
export default function FoldingCube({ amount }: { amount: number }) {
  const a = amount * Math.PI / 200
  return <Canvas orthographic camera={{ position: [0, 0, 8], zoom: 34, near: .1, far: 30 }} frameloop="demand" dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<span className="cube-fallback">Six squares make a cube.</span>}>
    <FitCamera /><ambientLight intensity={1.8} /><directionalLight position={[-3, 4, 7]} intensity={3} />
    <group position={[0, -.35, 0]}><Face color="#8751df" />
      <Hinge position={[-.5, 0, 0]} rotation={[0, a, 0]}><Face color="#fb872c" position={[-.5, 0, 0]} /></Hinge>
      <Hinge position={[.5, 0, 0]} rotation={[0, -a, 0]}><Face color="#4387eb" position={[.5, 0, 0]} /></Hinge>
      <Hinge position={[0, -.5, 0]} rotation={[-a, 0, 0]}><Face color="#468be9" position={[0, -.5, 0]} /></Hinge>
      <Hinge position={[0, .5, 0]} rotation={[a, 0, 0]}><Face color="#fc8830" position={[0, .5, 0]} /><Hinge position={[0, 1, 0]} rotation={[a, 0, 0]}><Face color="#b599f0" position={[0, .5, 0]} /></Hinge></Hinge>
    </group>
  </Canvas>
}
