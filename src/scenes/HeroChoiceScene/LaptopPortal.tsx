import { ScrollFilm } from '../../components/ui/ScrollFilm'
import { PORTAL_FROM, PORTAL_TO } from '../../components/motion/introTiming'

export function LaptopPortal() {
  return <div className="intro-portal">
    <div className="intro-portal-frame">
      <ScrollFilm scene="choice" src="/thestemifyway/assets/cinema/laptop-portal-1080p-60fps.mp4" poster="/thestemifyway/assets/cinema/laptop-portal-start.webp" label="The camera approaches the student's laptop, passes through the live class screen and enters an infinite whiteboard filled with dimensional learning objects." from={PORTAL_FROM} to={PORTAL_TO} fps={60} className="portal-film" />
    </div>
    <h2 className="portal-title" aria-label="The Stemify Way">
      {['The', 'Stemify', 'Way'].map(word => <span className="portal-title-mask" aria-hidden="true" key={word}><span className="portal-title-word">{word}</span></span>)}
    </h2>
  </div>
}
