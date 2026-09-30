import { Brand } from '../../components/ui/Brand'
import { navigation, pendingContent } from '../../content/homepage'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function Footer({ onAssessment }: { onAssessment: () => void }) {
  const { reduced, systemReduced, setUserReduced } = useReducedMotion()
  return <footer className="site-footer">
    <div className="footer-top"><Brand /><nav aria-label="Footer">{navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}<button className="text-button" onClick={onAssessment}>Free assessment <span aria-hidden="true">↗</span></button></nav></div>
    <div className="footer-bottom"><div><p>© {new Date().getFullYear()} STEMIFY</p><p className="footer-pending">{pendingContent.footer}</p></div><label className="motion-control"><input type="checkbox" checked={reduced} disabled={systemReduced} onChange={event => setUserReduced(event.target.checked)} /><span>Reduce motion{systemReduced && <small>Following your device setting</small>}</span></label><a className="back-top" href="#choice">Back to top <span aria-hidden="true">↑</span></a></div>
  </footer>
}
