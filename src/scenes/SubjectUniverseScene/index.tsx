import { SceneBoundary } from '../../components/ui/SceneBoundary'
import { lazy, Suspense, useRef, useState, useEffect, useMemo, type PointerEvent, type CSSProperties } from 'react'
import { subjects } from '../../content/subjects'
import { useInView } from '../../hooks/useInView'
import { moleculeNodes } from './molecule'
import type { MoleculeRotation } from './SubjectCanvas'
const SubjectCanvas = lazy(() => import('./SubjectCanvas'))
export function SubjectUniverseScene() {
  const [selected, setSelected] = useState<string | null>(null), [topic, setTopic] = useState<string | null>(null), [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null), orbit = useRef<HTMLDivElement>(null), backButton = useRef<HTMLButtonElement>(null)
  const labels = useRef(new Map<string, HTMLElement>()), invalidateRef = useRef(() => {})
  const rotation = useRef<MoleculeRotation>({ x: -.08, y: 0, dragging:false, held:false })
  const dragged = useRef(false), pointer = useRef<{ id:number; x:number; y:number; total:number } | null>(null)
  const active = useInView(ref)
  const nodes = useMemo(() => moleculeNodes(selected), [selected])
  const current = subjects.find(s => s.id === selected)
  const currentTopic = nodes.find(n => n.id === topic)
  const select = (id:string) => { setSelected(id); setTopic(null); rotation.current.x = -.08; rotation.current.y = 0; rotation.current.held = false }
  const back = () => {
    if (!selected) return
    const previous = selected
    setSelected(null); setTopic(null); rotation.current.x = -.08; rotation.current.y = 0
    requestAnimationFrame(() => labels.current.get(previous)?.focus({preventScroll:true}))
  }
  useEffect(() => { if (selected) backButton.current?.focus({preventScroll:true}) }, [selected])
  useEffect(() => {
    if (!orbit.current || ready) return
    const align = () => {
      const { width, height } = orbit.current!.getBoundingClientRect()
      const distance = Math.max(10, 7.3 / (2 * Math.tan(20 * Math.PI / 180) * width / height))
      nodes.forEach(node => {
        const label = labels.current.get(node.id)
        if (!label) return
        const [x,y,z] = node.position
        const h = 2 * (distance-z) * Math.tan(20 * Math.PI / 180)
        label.style.left = `${width / 2 + x / h * height}px`; label.style.top = `${height / 2 - y / h * height}px`
        label.style.setProperty('--atom-size', `${node.radius * 2 / h * height}px`)
        label.style.opacity = '1'; label.style.pointerEvents = 'auto'
      })
    }
    const observer = new ResizeObserver(align); observer.observe(orbit.current); align()
    return () => observer.disconnect()
  }, [nodes, ready])
  const start = (event:PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    pointer.current = {id:event.pointerId,x:event.clientX,y:event.clientY,total:0}; dragged.current = false
    rotation.current.dragging = true; invalidateRef.current()
  }
  const move = (event:PointerEvent<HTMLDivElement>) => {
    const p = pointer.current
    if (!p || p.id !== event.pointerId) return
    const dx = event.clientX-p.x, dy = event.clientY-p.y
    p.total += Math.hypot(dx,dy); p.x = event.clientX; p.y = event.clientY
    if (p.total < 6) return
    dragged.current = true
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    rotation.current.y += dx * .006
    if (event.pointerType !== 'touch') rotation.current.x = Math.max(-1.1, Math.min(1.1, rotation.current.x + dy * .005))
    invalidateRef.current()
  }
  const end = (event:PointerEvent<HTMLDivElement>) => { if (pointer.current?.id !== event.pointerId) return; pointer.current = null; rotation.current.dragging = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); invalidateRef.current() }
  return <div className="subject-explorer molecule-explorer" ref={ref} onKeyDown={event => { if(event.key==='Escape' && selected) { event.preventDefault(); back() } }}>
    <div ref={orbit} className="subject-orbit molecule-orbit" data-selected={selected ?? 'none'} data-renderer={ready ? 'webgl' : 'fallback'} tabIndex={0} role="group" aria-label="Subject molecule. Drag to rotate, or use the arrow keys." onPointerDownCapture={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={event => { if(!dragged.current && (event.target===event.currentTarget || (!ready && !(event.target as Element).closest('button')))) back() }} onKeyDown={event => {
      if(event.target !== event.currentTarget || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return
      event.preventDefault(); rotation.current.held = true
      if(event.key==='Home') { rotation.current.x = -.08; rotation.current.y = 0 }
      if(event.key==='ArrowLeft') rotation.current.y -= .18
      if(event.key==='ArrowRight') rotation.current.y += .18
      if(event.key==='ArrowUp') rotation.current.x = Math.max(-1.1,rotation.current.x-.12)
      if(event.key==='ArrowDown') rotation.current.x = Math.min(1.1,rotation.current.x+.12)
      invalidateRef.current()
    }} onBlurCapture={event => { if(!event.currentTarget.contains(event.relatedTarget as Node)) rotation.current.held=false }}>
      <div className="molecule-shadow" aria-hidden="true" />
      <div className="subject-canvas" aria-hidden="true"><SceneBoundary><Suspense fallback={null}><SubjectCanvas nodes={nodes} mode={selected ?? 'subjects'} active={active} rotation={rotation} labels={labels} orbit={orbit} invalidateRef={invalidateRef} dragged={dragged} pick={id => selected ? setTopic(id) : select(id)} back={back} onReady={setReady} advance={dt => { rotation.current.y += dt * .075 }} /></Suspense></SceneBoundary></div>
      <div className={`molecule-controls ${selected ? 'topic-orbit' : 'subject-controls'}`} aria-label={selected ? `${current?.name} topics` : 'Choose a subject'}>
        {nodes.map((node,i) => node.hub ? <span key={node.id} ref={el => { if(el) labels.current.set(node.id,el); else labels.current.delete(node.id) }} className="molecule-label molecule-hub selected-subject" style={{'--atom-color':node.color} as CSSProperties}>{node.name}</span> : <button key={node.id} ref={el => { if(el) labels.current.set(node.id,el); else labels.current.delete(node.id) }} className={`molecule-label ${selected ? 'topic-sphere' : `sphere-label sphere-label--${i}`}`} style={{'--atom-color':node.color} as CSSProperties} aria-pressed={selected ? topic===node.id : undefined} onFocus={event => { if(event.currentTarget.matches(':focus-visible')) { dragged.current=false; rotation.current.held=true; rotation.current.x=-.08; rotation.current.y=0; invalidateRef.current() } }} onClick={event => { event.stopPropagation(); if(dragged.current && event.detail !== 0) return; if(selected) setTopic(node.id); else select(node.id) }}>{node.name}{node.placeholder && <small>Placeholder</small>}</button>)}
      </div>
      <span className="molecule-instruction">Drag to rotate · {selected ? 'Click empty space to go back' : 'Select a subject'}</span>
    </div>
    <div className="subject-caption"><div><span className="eyebrow">{current ? 'A CLOSER LOOK' : 'FOLLOW THEIR CURIOSITY'}</span><h3>{current ? `Inside ${current.name}.` : 'Everything connects.'}</h3><p role="status">{current ? currentTopic ? `${currentTopic.name}${currentTopic.placeholder ? ' is a development placeholder. Topic details will be added once confirmed.' : ' selected.'}` : current.topics.length ? 'Choose a topic to explore.' : 'Topic names are placeholders until the curriculum details are confirmed.' : 'Turn the molecule. Find a subject that sparks their curiosity.'}</p></div>{current && <button ref={backButton} className="text-button subject-back" onClick={back}>← Back to subjects</button>}</div>
  </div>
}
