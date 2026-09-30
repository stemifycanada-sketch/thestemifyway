import { useEffect, useRef } from 'react'
import { useViewportQuality } from '../../hooks/useViewportQuality'
import { adaptations } from '../../content/homepage'
import { AdaptiveGraphic } from './AdaptiveGraphic'
export function AdaptiveSection() {
  const section = useRef<HTMLElement>(null)
  const quality = useViewportQuality()
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting) })
    })
    section.current?.querySelectorAll('.adapt-card').forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [])
  return <section ref={section} data-motion-running={quality.motionEnabled} id="adaptive" className="adaptive-section intro-adaptive" data-story-section aria-labelledby="adaptive-title" tabIndex={-1}>
    <div className="compact-seated"><img src="/thestemifyway/assets/cinema/orange-sitting-1080p-end.webp" alt="The same student seated at his desk, writing with a stylus and tablet while watching the online class on his laptop." /></div>
    <div className="chapter-heading adaptive-heading"><p className="eyebrow"><span className="chapter-number">02 /</span> BUILT AROUND THEM</p><h2 id="adaptive-title">Learning built around <br /><em>one student.</em></h2><p>Stemify adapts to every student's needs.</p></div>
    <ol className="adaptation-cards">{adaptations.map((item, i) => <li key={item.title} className={`adapt-card adapt-card--${i}`}>
      <div className="adapt-card-heading"><div><span className="item-number">0{i + 1}</span><h3>{item.title}</h3></div><AdaptiveGraphic index={i} /></div>
      <p>{item.description}</p>
    </li>)}</ol>
    <div className="scene-bottom"><span>THE PACE. THE PRACTICE. THE POSSIBILITIES.</span><span>All around your child ↘</span></div>
  </section>
}
