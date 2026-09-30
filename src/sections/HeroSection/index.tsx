import { HeroChoiceScene } from '../../scenes/HeroChoiceScene'
import { AdaptiveSection } from '../AdaptiveSection'
import { homepage } from '../../content/homepage'
import { LaptopPortal } from '../../scenes/HeroChoiceScene/LaptopPortal'
import { HeroHighlights } from './HeroHighlights'

export function HeroSection() {
  return <section id="choice" className="hero story-section intro-sequence" data-story-section aria-labelledby="choice-title" tabIndex={-1}>
    <div className="hero-stage intro-stage">
      <HeroChoiceScene />
      <div className="hero-copy">
        <h1 id="choice-title"><span className="hero-lead">{homepage.heroLead}</span>{' '}{homepage.heroLines.map((line, index) => <span className="hero-title-line" key={line}>
          {index > 0 && ' '}
          <span className={index === homepage.heroLines.length - 1 ? 'hero-emphasis' : undefined}>{line}</span>
        </span>)}</h1>
        <p className="hero-support">{homepage.heroSupport}</p>
        <HeroHighlights />
      </div>
      <div className="hero-baseline"><span>BUILT AROUND THEIR CURIOSITY</span><a className="scroll-link" href="#adaptive">Scroll to explore <span aria-hidden="true">↓</span></a></div>
      <AdaptiveSection />
      <LaptopPortal />
    </div>
  </section>
}
