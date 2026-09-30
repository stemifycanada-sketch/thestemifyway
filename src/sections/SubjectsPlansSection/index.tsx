import { useState } from 'react'
import { StorySection } from '../../components/ui/StorySection'
import { gradeBands, plans, type GradeBand } from '../../content/plans'
import { SubjectUniverseScene } from '../../scenes/SubjectUniverseScene'
export function SubjectsPlansSection() {
  const [band, setBand] = useState<GradeBand>('K–8')
  return <StorySection id="subjects" chapter="05" title="Curiosity has no edges." className="subjects-section"><SubjectUniverseScene />
    <div className="plans-heading"><div><p className="eyebrow">ROOM TO GROW</p><h3>Find their next chapter.</h3></div><div className="grade-toggle" role="group" aria-label="Grade band">{gradeBands.map(grade => <button aria-pressed={band === grade} key={grade} onClick={() => setBand(grade)}>{grade}</button>)}</div></div>
    <div className="plan-slots" aria-live="polite" aria-label={`${band} learning plans`}>{plans[band].length ? plans[band].map(plan => <article key={plan.id}><h4>{plan.name}</h4><p>{plan.price}</p><ul>{plan.inclusions.map(item => <li key={item}>{item}</li>)}</ul></article>) : [1, 2].map(n => <article className="plan-card" key={`${band}-${n}`}><div className="plan-topline"><span className="eyebrow">{band} / PLAN {String(n).padStart(2, '0')}</span><span aria-hidden="true">↗</span></div><h4>A path to be defined.</h4><p>Plan details coming soon.</p><div className="plan-rule" /><small>Content placeholder · Names, pricing and inclusions will be added once confirmed.</small></article>)}</div>
  </StorySection>
}
