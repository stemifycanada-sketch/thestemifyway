import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useViewportQuality } from '../hooks/useViewportQuality'
import type { RootState } from '@react-three/fiber'

// Lazy-only import: no WebGL context or Three.js download on the M1 skeleton.
export default function SceneCanvas({ children, active, fallback }: { children: ReactNode; active: boolean; fallback: ReactNode }) {
  const quality = useViewportQuality()
  const [lost, setLost] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const onLost = (event: Event) => { event.preventDefault(); setLost(true) }
  useEffect(() => () => canvas.current?.removeEventListener('webglcontextlost', onLost), [])
  const created = (state: RootState) => {
    canvas.current = state.gl.domElement
    canvas.current.addEventListener('webglcontextlost', onLost, { once: true })
  }
  if (lost) return fallback
  return <Canvas
    dpr={[1, quality.maxDpr]}
    frameloop={active && quality.tabVisible ? 'demand' : 'never'}
    camera={{ position: [0, 1.6, 6], fov: 40 }}
    gl={{ antialias: quality.tier === 'desktop', alpha: true, powerPreference: 'low-power' }}
    fallback={fallback}
    onCreated={created}
  ><Suspense fallback={null}>{children}</Suspense></Canvas>
}
