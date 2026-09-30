import { useEffect, useRef } from 'react'
import { pendingContent } from '../../content/homepage'
import { ContentPlaceholder } from './ContentPlaceholder'

export function AssessmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className="assessment-dialog" aria-labelledby="assessment-title" aria-describedby="assessment-description" onClose={onClose} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <div className="dialog-heading"><p className="eyebrow">STEMIFY</p><button className="text-button" onClick={onClose} aria-label="Close assessment panel">Close <span aria-hidden="true">×</span></button></div>
    <h2 id="assessment-title">Free assessment</h2>
    <div id="assessment-description"><ContentPlaceholder>{pendingContent.assessment}</ContentPlaceholder></div>
    <button className="button button--dark" onClick={onClose}>Back to the story <span aria-hidden="true">↗</span></button>
  </dialog>
}
