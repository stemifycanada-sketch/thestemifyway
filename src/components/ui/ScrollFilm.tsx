import { useEffect, useRef } from 'react'
import { useInView } from '../../hooks/useInView'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import type { StoryId } from '../../content/homepage'
import { ScrollTrigger } from '../../utils/animation/gsap'

/** Seek to the most recent scroll target after each decoded frame. Never autoplay. */
export function ScrollFilm({ scene, src, poster, label, from = 0, to = 1, className = '', useSceneOnCompact = false, fps = 24, endPoster }: { scene: StoryId; src: string; poster: string; label: string; from?: number; to?: number; className?: string; useSceneOnCompact?: boolean; fps?: number; endPoster?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const near = useInView(host, '100% 0px')
  const getProgress = useScrollProgress(scene)
  const { reduced } = useReducedMotion()
  const compact = useMediaQuery('(max-width: 1023px)')
  useEffect(() => {
    const media = video.current
    if (!media || reduced || !near) return
    const state = getProgress()
    let frame = 0
    let compactProgress = 0
    const seek = () => {
      // Coalesce scroll events. Cancelling/requeuing on every GSAP tick can
      // starve the pending seek during continuous or rapidly reversed input.
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!Number.isFinite(media.duration) || media.seeking || document.hidden) return
        const progress = compact && !useSceneOnCompact ? compactProgress : (state.progress - from) / (to - from)
        if (endPoster) {
          // Finish the generated clip's incomplete fade without modifying the source.
          // This follows the same reversible seek state on desktop and touch layouts.
          const fade = Math.min(1, Math.max(0, (progress - .88) / .12))
          host.current?.style.setProperty('--film-end-opacity', String(fade * fade * (3 - 2 * fade)))
        }
        const lastFrame = Math.max(0, Math.round(media.duration * fps) - 1)
        const index = Math.round(Math.min(1, Math.max(0, progress)) * lastFrame)
        // Target the inside of a frame, avoiding rounding onto its predecessor.
        // A fixed 45ms threshold discarded adjacent 24fps and 60fps frames.
        const target = Math.min(media.duration - .001, index / fps + .001)
        if (Math.abs(media.currentTime - target) > .25 / fps) media.currentTime = target
      })
    }
    // Small screens keep native vertical scrolling; each visible shot scrubs locally.
    const trigger = compact && !useSceneOnCompact ? ScrollTrigger.create({
      trigger: host.current!, start: 'top 85%', end: 'bottom 20%',
      onUpdate: self => { compactProgress = self.progress; seek() },
      onRefresh: self => { compactProgress = self.progress; seek() },
    }) : undefined
    if (trigger) compactProgress = trigger.progress
    else state.listeners.add(seek)
    media.addEventListener('loadeddata', seek)
    media.addEventListener('seeked', seek)
    document.addEventListener('visibilitychange', seek)
    seek()
    return () => { trigger?.kill(); cancelAnimationFrame(frame); state.listeners.delete(seek); media.removeEventListener('loadeddata', seek); media.removeEventListener('seeked', seek); document.removeEventListener('visibilitychange', seek); media.pause() }
  }, [getProgress, near, reduced, compact, from, to, useSceneOnCompact, fps, endPoster])
  return <div className={`scroll-film ${className}`} ref={host}>
    <img src={poster} alt={label} loading={scene === 'choice' ? 'eager' : 'lazy'} fetchPriority={scene === 'choice' ? 'high' : 'auto'} />
    {!reduced && near && <video ref={video} src={src} poster={poster} muted playsInline preload="auto" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />}
    {endPoster && !reduced && <img className="scroll-film-end" src={endPoster} alt="" aria-hidden="true" loading="lazy" />}
  </div>
}
