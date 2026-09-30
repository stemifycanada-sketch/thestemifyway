import { Component, lazy, Suspense, type ReactNode } from 'react'

const SceneCanvas = lazy(() => import('../../three/SceneCanvas'))

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function SceneViewport({ active, children, fallback }: { active: boolean; children?: ReactNode; fallback: ReactNode }) {
  if (!children) return fallback
  return <SceneErrorBoundary fallback={fallback}>
    <Suspense fallback={fallback}><SceneCanvas active={active} fallback={fallback}>{children}</SceneCanvas></Suspense>
  </SceneErrorBoundary>
}
