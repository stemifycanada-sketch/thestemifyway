import { useContext, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { LabActivity } from './LabPrimitives'

export function ResourceVideo({ name, title, description }: { name: string; title: string; description: string }) {
  const active = useContext(LabActivity)
  const { reduced } = useReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const source = `/thestemifyway/media/resource-loops/${name}-loop.mp4`
  const poster = `/thestemifyway/media/resource-loops/${name}-poster.jpg`

  useEffect(() => {
    const element = video.current
    if (!element || reduced) return
    // Delay even the media request until this tile is visible in its clipped row.
    if (active && !element.getAttribute('src')) element.src = source
    if (active && !paused && !failed) void element.play().catch(() => { /* The visible Play control allows a user gesture retry. */ })
    else element.pause()
    return () => element.pause()
  }, [active, paused, reduced, source, failed])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (playing) { setPaused(true); element.pause() }
    else { setPaused(false); if (active) void element.play().catch(() => {}) }
  }

  return <div className="lab-video">
    <img src={poster} alt={description} width={1920} height={1080} loading="lazy" />
    {!reduced && <>
      <video ref={video} aria-hidden="true" muted loop playsInline preload="none" poster={poster} width={1920} height={1080} hidden={failed} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
      {!failed && <button className="lab-video-toggle" data-play-control aria-label={`${playing ? 'Pause' : 'Play'} ${title.toLowerCase()} video`} onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>}
    </>}
  </div>
}
