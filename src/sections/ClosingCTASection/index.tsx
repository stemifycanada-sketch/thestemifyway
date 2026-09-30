import { homepage } from '../../content/homepage'
import { ClosingScene } from '../../scenes/ClosingScene'
export function ClosingCTASection({ onAssessment }: { onAssessment: () => void }) {
  return <section id="understand" className="story-section section--closing" data-story-section aria-labelledby="understand-title" tabIndex={-1}><p className="eyebrow"><span className="chapter-number">06 /</span> THEIR STORY STARTS HERE</p><h2 id="understand-title">Before we teach,<br /><em>we understand.</em></h2><p className="closing-support">{homepage.closingSupport}</p><button className="button button--orange" onClick={onAssessment}>{homepage.assessment}<span aria-hidden="true">↗</span></button><ClosingScene /></section>
}
