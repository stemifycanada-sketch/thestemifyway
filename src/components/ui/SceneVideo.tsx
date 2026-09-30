import { useEffect, useRef } from 'react'
import { useInView } from '../../hooks/useInView'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useViewportQuality } from '../../hooks/useViewportQuality'
import type { ReadyAsset } from '../../assets/manifest'

// Prepared for M5 resource loops. Important explanation/controls remain adjacent HTML.
// Reduced mode renders the poster without requesting video bytes.
export function SceneVideo({ asset, label }: { asset: ReadyAsset; label: string }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const visible = useInView(wrapper)
  const { reduced } = useReducedMotion()
  const { tabVisible } = useViewportQuality()
  useEffect(() => {
    const element = video.current
    if (!element) return
    if (visible && tabVisible && !reduced) void element.play().catch(() => { /* Keep native controls/poster if playback is blocked. */ })
    else element.pause()
    return () => element.pause()
  }, [visible, tabVisible, reduced])
  return <div ref={wrapper}>
    {reduced
      ? asset.poster ? <img src={asset.poster} alt={label} loading="lazy" /> : <p>{label} — visual pending.</p>
      : <video ref={video} src={visible ? asset.src : undefined} poster={asset.poster} muted playsInline loop controls preload="none" aria-label={label} />}
  </div>
}
