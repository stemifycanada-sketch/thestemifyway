import { LearningJourneyScene } from '../../scenes/LearningJourneyScene'
const stages = [
  { name: 'Foundations', kicker: 'FIRST, FIND YOUR FOOTING.', text: 'Understand the starting point. Close gaps, strengthen concepts and build confidence.' },
  { name: 'Advanced', kicker: 'THEN, GO A LITTLE FURTHER.', text: 'Explore deeper concepts, harder problems and new ways to reason.' },
  { name: 'Competitive', kicker: 'READY FOR A NEW CHALLENGE.', text: 'Take on advanced problem solving and competition-style challenges, where appropriate.' },
]
export function JourneySection() {
  return <section id="journey" className="cinematic-section journey-section" data-story-section aria-labelledby="journey-title" tabIndex={-1}><div className="cinema-stage journey-stage"><div className="chapter-heading journey-heading"><p className="eyebrow"><span className="chapter-number">04 /</span> THE LEARNING JOURNEY</p><h2 id="journey-title">Small steps.<br /><em>Expanding worlds.</em></h2></div><LearningJourneyScene /><ol className="journey-copy-track">{stages.map((stage, i) => <li className={`journey-stop journey-stop--${i}`} key={stage.name}><span className="eyebrow">0{i + 1} / {stage.kicker}</span><h3>{stage.name}</h3><p>{stage.text}</p></li>)}</ol><div className="journey-progress"><span>FOUNDATIONS</span><i /><span>ADVANCED</span><i /><span>COMPETITIVE</span></div></div></section>
}
