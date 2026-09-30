import { useEffect, useId, useRef, useState } from 'react'

const highlights = [
  { title: 'Human-led learning', detail: 'Expert teachers build real connections, supported by technology and AI.', color: 'blue' },
  { title: 'Canada-aligned learning', detail: 'Canada-aligned curriculum, with broad topic coverage across our programs.', color: 'orange' },
  { title: 'Family-friendly scheduling', detail: 'Flexible class times that work around your family.', color: 'mint' },
  { title: 'Progress made clear', detail: 'Progress tracking and regular reports keep you in the picture.', color: 'violet' },
] as const

function HighlightIcon({ index }: { index: number }) {
  const id = useId().replaceAll(':', '')
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-blue`} x1="14" y1="10" x2="45" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#86bcff" /><stop offset=".5" stopColor="#376ce2" /><stop offset="1" stopColor="#26449d" /></linearGradient>
      <linearGradient id={`${id}-orange`} x1="17" y1="8" x2="47" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#ffc776" /><stop offset=".5" stopColor="#ff812f" /><stop offset="1" stopColor="#ce4a20" /></linearGradient>
      <linearGradient id={`${id}-mint`} x1="13" y1="10" x2="48" y2="52" gradientUnits="userSpaceOnUse"><stop stopColor="#b8f1d9" /><stop offset=".55" stopColor="#52bc98" /><stop offset="1" stopColor="#247563" /></linearGradient>
      <linearGradient id={`${id}-violet`} x1="17" y1="10" x2="47" y2="55" gradientUnits="userSpaceOnUse"><stop stopColor="#d3b2ff" /><stop offset=".6" stopColor="#9b72d7" /><stop offset="1" stopColor="#62429e" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="21" ry="3" fill="#684329" opacity=".09" />
    {index === 0 && <>
      <path d="M13 26C13 16 21 10 31 10H48V37H26L18 43V37" stroke={`url(#${id}-mint)`} strokeWidth="5" strokeLinejoin="round" />
      <path d="M5 49C5 39 10 35 19 35S33 40 33 49V53H5Z" fill={`url(#${id}-blue)`} /><circle cx="19" cy="25" r="9" fill={`url(#${id}-blue)`} />
      <path d="M33 49C33 41 38 37 46 37S59 42 59 49V53H33Z" fill={`url(#${id}-orange)`} /><circle cx="46" cy="28" r="8" fill={`url(#${id}-orange)`} />
      <path d="M27 22L30 25 35 19" stroke="#fff8ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {index === 1 && <>
      <path d="M12 16L48 13 54 19V51L18 55 12 49Z" fill={`url(#${id}-blue)`} /><path d="M18 14L49 11V46L18 50Z" fill="#fff7e9" stroke="#e0bda0" />
      <path d="M33 14L37 24 42 21 41 29 48 27 45 36 48 39 36 41 35 48H32L32 41 20 38 23 35 21 28 28 30 26 22 31 24Z" fill={`url(#${id}-orange)`} />
      <path d="M18 19V46" stroke="#fff" strokeWidth="2" />
    </>}
    {index === 2 && <>
      <rect x="8" y="13" width="42" height="40" rx="8" fill={`url(#${id}-mint)`} /><rect x="11" y="24" width="35" height="24" rx="4" fill="#f7fff9" />
      <path d="M18 9V18M39 9V18" stroke="#286c5a" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 32H21M27 32H31M17 40H21" stroke="#92bfa6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="42" r="14" fill={`url(#${id}-orange)`} /><circle cx="46" cy="42" r="10" fill="#fff8ec" /><path d="M46 36V42L51 45" stroke="#ad4927" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {index === 3 && <>
      <rect x="12" y="8" width="37" height="46" rx="7" fill={`url(#${id}-violet)`} /><rect x="17" y="13" width="27" height="35" rx="3" fill="#fff8ef" />
      <path d="M23 18H36M23 23H31" stroke="#c5b3da" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="22" y="36" width="5" height="7" rx="1.5" fill={`url(#${id}-orange)`} /><rect x="29" y="31" width="5" height="12" rx="1.5" fill={`url(#${id}-blue)`} /><rect x="36" y="27" width="5" height="16" rx="1.5" fill={`url(#${id}-mint)`} />
      <circle cx="48" cy="47" r="11" fill={`url(#${id}-mint)`} /><path d="M43 47L47 51 54 43" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </svg>
}

export function HeroHighlights() {
  const [active, setActive] = useState<number | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => { if (!root.current?.contains(event.target as Node)) setActive(null) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  return <div className="hero-highlights" ref={root} aria-label="Learning with Stemify" onKeyDown={event => { if(event.key === 'Escape') { event.stopPropagation(); setActive(null) } }} onBlur={event => { if(!event.currentTarget.contains(event.relatedTarget as Node)) setActive(null) }} onPointerLeave={event => { if(event.pointerType !== 'touch' && !event.currentTarget.querySelector(':focus-visible')) setActive(null) }}>
    <div className="hero-highlights-grid">{highlights.map((item, index) => <button key={item.title} type="button" className={`hero-highlight hero-highlight--${item.color}`} aria-expanded={active === index} aria-controls={`${id}-${index}`} aria-describedby={active === index ? `${id}-${index}` : undefined} onPointerEnter={event => { if(event.pointerType !== 'touch') setActive(index) }} onFocus={event => { if(event.currentTarget.matches(':focus-visible')) setActive(index) }} onClick={() => setActive(current => current === index ? null : index)}>
      <span className="hero-highlight-icon"><HighlightIcon index={index} /></span><span>{item.title}</span>
    </button>)}</div>
    <div className="hero-highlight-explanation">{highlights.map((item, index) => <p key={item.title} id={`${id}-${index}`} hidden={active !== index}>{item.detail}</p>)}</div>
  </div>
}
