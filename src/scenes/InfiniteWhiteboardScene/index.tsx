import { ScrollFilm } from '../../components/ui/ScrollFilm'
import { WHITEBOARD_FILM_FROM, WHITEBOARD_FILM_TO } from '../../components/motion/whiteboardTiming'
export { ResourceCanvas } from './resources/ResourceCanvas'
export function InfiniteWhiteboardScene() {
  return <div className="whiteboard-film"><ScrollFilm scene="interactive" src="/thestemifyway/assets/cinema/living-whiteboard-1080p.mp4" poster="/thestemifyway/assets/cinema/laptop-portal-end.webp" endPoster="/thestemifyway/assets/cinema/whiteboard-clean.webp" label="The camera rises over a living learning world as balls roll, a book page turns and a diagram develops, then settles onto a clear dotted whiteboard." from={WHITEBOARD_FILM_FROM} to={WHITEBOARD_FILM_TO} /></div>
}
