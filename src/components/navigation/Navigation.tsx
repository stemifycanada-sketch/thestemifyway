import { useEffect, useRef, useState } from 'react'
import { resourceNavigation } from '../../content/homepage'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Brand } from '../ui/Brand'

export function Navigation({ onAssessment, assessmentOpen = false }: { onAssessment: () => void; assessmentOpen?: boolean }) {
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const menuButton = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const resourcesButton = useRef<HTMLButtonElement>(null)
  const closeAll = () => { setOpen(false); setResourcesOpen(false) }
  const followLink = (href: string) => { closeAll(); document.querySelector<HTMLElement>(href)?.focus({ preventScroll: true }) }
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (resourcesOpen) { setResourcesOpen(false); resourcesButton.current?.focus() }
      else if (open) { setOpen(false); menuButton.current?.focus() }
    }
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setOpen(false); setResourcesOpen(false) }
    }
    window.addEventListener('keydown', close)
    window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', outside) }
  }, [open, resourcesOpen])
  // Collapse mobile disclosure when crossing the desktop breakpoint.
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const collapse = () => { setOpen(false); setResourcesOpen(false) }
    media.addEventListener('change', collapse)
    return () => media.removeEventListener('change', collapse)
  }, [])

  return <header className="site-header" ref={header} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeAll()
  }}>
    <div className="nav-inner">
      <Brand inverted />
      <nav id="primary-navigation" className="primary-navigation" aria-label="Primary" hidden={!desktop && !open}>
        <a href="#choice">The Stemify Way</a>
        <a href="/portal">Family portal</a>
        <a href="/join">Join a quiz</a>
        <a href="#subjects" onClick={() => followLink('#subjects')}>Programs</a>
        <div className="nav-resources" onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setResourcesOpen(false)
        }}>
          <button ref={resourcesButton} className="resources-toggle" aria-expanded={resourcesOpen} aria-controls="resources-links" onClick={() => setResourcesOpen(value => !value)}>Resources <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <div className="resources-dropdown" id="resources-links" hidden={!resourcesOpen}>
            {resourceNavigation.map(link => <a key={link.href} href={link.href} onClick={() => followLink(link.href)}>{link.label}<span aria-hidden="true">↗</span></a>)}
          </div>
        </div>
      </nav>
      <div className="nav-actions">
        <button className="button nav-assessment" aria-haspopup="dialog" aria-expanded={assessmentOpen} onClick={() => { closeAll(); onAssessment() }}>Free assessment <span aria-hidden="true">↗</span></button>
        <button ref={menuButton} className="menu-button" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => { setOpen(value => !value); setResourcesOpen(false) }}><span aria-hidden="true">{open ? '×' : '☰'}</span></button>
      </div>
    </div>
  </header>
}
