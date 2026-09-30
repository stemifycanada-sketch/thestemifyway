import type { ReactNode } from 'react'
import type { StoryId } from '../../content/homepage'

export function StorySection({ id, chapter, title, className = '', children }: { id: StoryId; chapter: string; title: string; className?: string; children: ReactNode }) {
  return <section id={id} className={`story-section ${className}`} data-story-section aria-labelledby={`${id}-title`} tabIndex={-1}>
    <div className="section-heading"><p className="eyebrow"><span className="chapter-number">{chapter}</span> STEMIFY</p><h2 id={`${id}-title`}>{title}</h2></div>
    {children}
  </section>
}
