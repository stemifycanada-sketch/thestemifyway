import { useEffect, useRef, type ReactNode } from 'react'
import type { StoryId } from '../../content/homepage'
import { useInView } from '../../hooks/useInView'
import { prefetchSceneImages } from '../../assets/loaders'
import { SceneViewport } from './SceneViewport'

export function SceneShell({ scene, label, variant = '', children }: { scene: StoryId; label: string; variant?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const nearby = useInView(ref, '400px')
  const visible = useInView(ref)
  useEffect(() => {
    if (!nearby) return
    const controller = new AbortController()
    void prefetchSceneImages(scene, controller.signal)
    return () => controller.abort()
  }, [nearby, scene])
  const fallback = <div className="scene-placeholder" aria-hidden="true">
    <div className="scene-register scene-register--top" />
    <span className="scene-placeholder__label">Visual placeholder</span>
    <span className="scene-placeholder__title">{label}</span>
    <div className="scene-register scene-register--bottom" />
  </div>
  return <div ref={ref} className={`scene-shell ${variant}`} data-scene={scene} role="img" aria-label={`${label}. Visual placeholder; scene assets pending.`}>
    <SceneViewport active={visible} fallback={fallback}>{children}</SceneViewport>
  </div>
}
