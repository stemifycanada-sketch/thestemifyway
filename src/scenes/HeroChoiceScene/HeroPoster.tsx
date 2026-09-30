import type { CSSProperties } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import desktop from './poster-desktop.json'
import mobile from './poster-mobile.json'

// Same live composition, captured without text. All labels remain HTML.
export function HeroPoster() {
  const portrait = useMediaQuery('(max-width: 599px)')
  const kind = portrait ? 'mobile' : 'desktop'
  const layout = portrait ? mobile : desktop
  return <div className="hero-poster" aria-hidden="true"><div className={`hero-poster-art hero-poster-art--${kind}`} style={{ '--poster-ratio': layout.width / layout.height } as CSSProperties}>
    <img src={`/thestemifyway/assets/hero/hero-poster-${kind}-v2.webp`} alt="" width={layout.width} height={layout.height} fetchPriority="high" />
    {layout.labels.filter(label => label.equation).map(label => <span key={label.text} className={label.equation ? 'poster-equation' : 'poster-caption'} style={{ left: `${label.x}%`, top: `${label.y}%` }}>{label.text}</span>)}
  </div></div>
}
