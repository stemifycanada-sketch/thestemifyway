import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from './api'
import type { Student, User } from './api'
import { mergeLearningPages, safeLearningUrl, safeQuizEmbed, uploadLearningFile } from './learning-api'
import type { Assignment, AssignmentStatus, LearningData, Resource, ResourceKind, Submission } from './learning-api'
import './learning.css'

const blankLearning: LearningData = { resources: [], assignments: [], submissions: [], page: 0, hasMore: false }
const statusNames: Record<AssignmentStatus, string> = { assigned: 'To do', submitted: 'Awaiting review', needs_revision: 'Try again', reviewed: 'Reviewed' }
const kindNames: Record<ResourceKind, string> = { worksheet: 'Worksheet', wayground: 'Wayground quiz', reference: 'Reference' }
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'
const formatDate = (value: string, timezone?: string) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', ...(timezone ? { timeZone: timezone } : {}) }).format(new Date(value))

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="portal-field"><span>{label}</span>{children}</label>
}
function useAction() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function run(work: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError('')
    try { await work() } catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  return { busy, error, run }
}
function Attachment({ id, name }: { id: string; name: string | null }) {
  return <a className="learning-attachment" href={`/api/learning/files/${encodeURIComponent(id)}`} download>↓ {name || 'Download file'}</a>
}
function FileField({ label, name = 'attachment', required = false }: { label: string; name?: string; required?: boolean }) {
  return <Field label={label}><input type="file" name={name} accept="application/pdf,image/png,image/jpeg" required={required} /><span className="learning-help">PDF, PNG or JPEG · up to 5 MB</span></Field>
}
async function fileFromForm(values: FormData, csrf: string) {
  const file = values.get('attachment')
  return file instanceof File && file.size ? (await uploadLearningFile(file, csrf)).id : undefined
}

function ResourceContent({ resource }: { resource: Resource }) {
  const [quizOpen, setQuizOpen] = useState(false)
  const link = safeLearningUrl(resource.link_url), embed = resource.kind === 'wayground' ? safeQuizEmbed(resource.embed_url) : null
  return <div className="learning-resource-content">
    {resource.description && <p className="learning-copy">{resource.description}</p>}
    <div className="portal-actions">
      {resource.file_id && <Attachment id={resource.file_id} name={resource.file_name} />}
      {link && <a className="portal-secondary" href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{resource.kind === 'wayground' ? 'Launch quiz ↗' : 'Open resource ↗'}</a>}
      {embed && <button type="button" className="portal-secondary" onClick={() => setQuizOpen(!quizOpen)}>{quizOpen ? 'Close quiz' : 'Open quiz here'}</button>}
    </div>
    {resource.kind === 'wayground' && <p className="learning-help">Quizzes are hosted by Wayground and may need a game code or sign-in. For an assigned quiz, report completion from Homework so your teacher can check the result. Scores do not sync automatically.</p>}
    {embed && !quizOpen && <p className="learning-help">Choosing “Open quiz here” connects to Wayground in this page.</p>}
    {embed && quizOpen && <div className="learning-quiz"><iframe src={embed} title={`${resource.title} · Wayground quiz`} referrerPolicy="no-referrer" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" /><p className="learning-help">If the quiz cannot open here, use the launch link above. Closing this view can end your current embedded session.</p></div>}
  </div>
}

function ResourceForm({ csrf, done, close }: { csrf: string; done: () => Promise<void>; close: () => void }) {
  const action = useAction(), [kind, setKind] = useState<ResourceKind>('worksheet')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    await action.run(async () => {
      const linkUrl = String(values.get('linkUrl') || '').trim(), embedUrl = String(values.get('embedUrl') || '').trim()
      if (linkUrl && !safeLearningUrl(linkUrl)) throw new Error('Use a complete HTTPS resource link.')
      if (kind === 'wayground' && linkUrl && !safeQuizEmbed(linkUrl)) throw new Error('Use an official HTTPS Wayground or Quizizz launch link.')
      if (embedUrl && !safeQuizEmbed(embedUrl)) throw new Error('Use the official HTTPS embed URL copied from Wayground or Quizizz.')
      const fileId = await fileFromForm(values, csrf)
      if (!fileId && !linkUrl && !embedUrl && !String(values.get('description') || '').trim()) throw new Error('Attach a file, add a resource link or write resource instructions before publishing.')
      await api('/learning/resources', csrf, {
        title: values.get('title'), description: values.get('description'), subject: values.get('subject'), grade: values.get('grade'),
        kind, visibility: values.get('visibility'), fileId, linkUrl, embedUrl, published: true,
      })
      await done(); close()
    })
  }
  return <form className="portal-panel learning-editor" onSubmit={submit}>
    <div className="portal-section-heading"><div><p className="portal-eyebrow">BUILD YOUR RESOURCE COLLECTION</p><h3>Share a resource</h3></div><button type="button" className="portal-text-button" disabled={action.busy} onClick={close}>Close</button></div>
    <div className="portal-form-grid">
      <Field label="Resource title"><input name="title" required maxLength={100} /></Field>
      <Field label="Type"><select value={kind} onChange={event => setKind(event.target.value as ResourceKind)}>{Object.entries(kindNames).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></Field>
      <Field label="Subject"><input name="subject" required maxLength={100} placeholder="e.g. Mathematics" /></Field>
      <Field label="Grade or level"><input name="grade" required maxLength={60} placeholder="e.g. Grade 5" /></Field>
      <Field label="Who can access it?"><select name="visibility" defaultValue="assigned"><option value="assigned">Only learners assigned this resource</option><option value="library">All families in the library</option></select></Field>
    </div>
    <Field label="Description"><textarea name="description" rows={3} maxLength={5000} /></Field>
    {kind !== 'wayground' && <FileField label="Upload a worksheet or reference · optional with a link" />}
    <Field label={kind === 'wayground' ? 'Wayground quiz launch link' : 'Resource link · optional with a file'}><input name="linkUrl" type="url" placeholder={kind === 'wayground' ? 'https://wayground.com/…' : 'https://…'} required={kind === 'wayground'} maxLength={2000} /></Field>
    {kind === 'wayground' && <><Field label="Official embed URL · optional"><input name="embedUrl" type="url" placeholder="Paste the iframe src from Wayground’s Embed option" maxLength={2000} /></Field><p className="learning-help">For a public resource, open ⋯ → Embed in Wayground and copy the iframe’s src URL. Paste only that URL, not the HTML. Flashcards do not support embedding. Keep the launch link for quizzes that cannot open here.</p></>}
    <p className="learning-help">Publishing to the library shares the resource with every family. Use assigned access for an individual learner’s material.</p>
    {action.error && <p className="portal-error" role="alert">{action.error}</p>}
    <button className="portal-primary" disabled={action.busy}>{action.busy ? 'Uploading & publishing…' : 'Publish resource'}</button>
  </form>
}

function AssignmentForm({ students, resources, csrf, done, close }: { students: Student[]; resources: Resource[]; csrf: string; done: () => Promise<void>; close: () => void }) {
  const action = useAction()
  return <form className="portal-panel learning-editor" onSubmit={event => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    void action.run(async () => {
      const dueAt = String(values.get('dueAt') || '')
      await api('/learning/assignments', csrf, {
        studentId: values.get('studentId'), resourceId: values.get('resourceId') || undefined, title: values.get('title'), instructions: values.get('instructions'),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      })
      await done(); close()
    })
  }}>
    <div className="portal-section-heading"><div><p className="portal-eyebrow">A LITTLE PRACTICE GOES A LONG WAY</p><h3>Assign homework</h3></div><button type="button" className="portal-text-button" disabled={action.busy} onClick={close}>Close</button></div>
    <div className="portal-form-grid">
      <Field label="Student"><select name="studentId" required defaultValue=""><option value="">Choose a learner</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}{student.parent_email ? ` · ${student.parent_email}` : ''}</option>)}</select></Field>
      <Field label="Homework title"><input name="title" required maxLength={100} /></Field>
      <Field label="Resource · optional"><select name="resourceId" defaultValue=""><option value="">Instructions only</option>{resources.filter(resource => resource.published).map(resource => <option key={resource.id} value={resource.id}>{resource.title} · {resource.grade}</option>)}</select></Field>
      <Field label={`Due date · optional · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}><input name="dueAt" type="datetime-local" /></Field>
    </div>
    <Field label="Instructions"><textarea name="instructions" required rows={4} maxLength={10000} placeholder="What should the learner practise and submit?" /></Field>
    <p className="learning-help">The learner and their parent can see this assignment. Submitted work comes back to your teaching desk for review.</p>
    {action.error && <p className="portal-error" role="alert">{action.error}</p>}
    <button className="portal-primary" disabled={action.busy}>{action.busy ? 'Assigning…' : 'Assign to student'}</button>
  </form>
}

function SubmissionForm({ assignment, quiz, csrf, done }: { assignment: Assignment; quiz: boolean; csrf: string; done: () => Promise<void> }) {
  const action = useAction()
  return <form className="learning-submit" onSubmit={event => {
    event.preventDefault()
    const form = event.currentTarget, values = new FormData(form)
    void action.run(async () => {
      const answerText = String(values.get('answerText') || '').trim()
      const fileId = await fileFromForm(values, csrf)
      if (!answerText && !fileId) throw new Error('Add your answer or attach your work before submitting.')
      await api(`/learning/assignments/${assignment.id}/submissions`, csrf, { answerText, fileId, version: assignment.version })
      form.reset(); await done()
    })
  }}>
    <h4>{assignment.status === 'needs_revision' ? 'Have another go' : quiz ? 'Tell your teacher how it went' : 'Your turn'}</h4>
    <Field label={quiz ? 'Quiz completion and any questions' : 'Your answer or a message for your teacher'}><textarea name="answerText" rows={4} maxLength={20000} placeholder={quiz ? 'I finished the quiz. The question I found tricky was…' : 'Write here, or upload your completed work below.'} /></Field>
    <FileField label={quiz ? 'Quiz result or working · optional' : 'Completed worksheet or photo · optional'} />
    {quiz && <p className="learning-help">This reports completion to your teacher. They will check the Wayground result and leave feedback here.</p>}
    {action.error && <p className="portal-error" role="alert">{action.error}</p>}
    <button className="portal-primary" disabled={action.busy}>{action.busy ? 'Submitting…' : 'Submit for review'}</button>
  </form>
}

function ReviewForm({ assignment, submission, csrf, done }: { assignment: Assignment; submission: Submission; csrf: string; done: () => Promise<void> }) {
  const action = useAction()
  return <form className="learning-review" onSubmit={event => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    void action.run(async () => {
      const score = String(values.get('score') || '').trim()
      await api(`/learning/submissions/${submission.id}/review`, csrf, { feedback: values.get('feedback'), score: score ? Number(score) : null, status: values.get('status'), version: assignment.version })
      await done()
    })
  }}>
    <h4>Check this work</h4>
    <Field label="Feedback for the learner and parent"><textarea name="feedback" rows={4} required maxLength={10000} defaultValue={submission.feedback} placeholder="Celebrate what worked and explain the next step." /></Field>
    <div className="portal-form-grid"><Field label="Review outcome"><select name="status" defaultValue="reviewed"><option value="reviewed">Reviewed · complete</option><option value="needs_revision">Needs another attempt</option></select></Field><Field label="Score out of 100 · optional"><input name="score" type="number" min={0} max={100} step="0.1" defaultValue={submission.score ?? ''} /></Field></div>
    <p className="learning-help">Check the attached work or Wayground report before saving. Your feedback is shared with this learner and their parent.</p>
    {action.error && <p className="portal-error" role="alert">{action.error}</p>}
    <button className="portal-primary" disabled={action.busy}>{action.busy ? 'Saving review…' : 'Share review'}</button>
  </form>
}

function SubmissionHistory({ assignment, submissions, staff, csrf, done, timezone }: { assignment: Assignment; submissions: Submission[]; staff: boolean; csrf: string; done: () => Promise<void>; timezone?: string }) {
  return <div className="learning-history">{submissions.map((submission, index) => <details key={submission.id} className="learning-attempt" open={index === 0}>
    <summary><span>Attempt {submission.attempt ?? submissions.length - index} <span className="learning-attempt-date">· {formatDate(submission.submitted_at, timezone)}</span></span><span className={`learning-status learning-status-${submission.review_status || 'submitted'}`}>{submission.review_status ? statusNames[submission.review_status] : 'Awaiting review'}</span></summary>
    <div className="learning-attempt-body">
      {submission.answer_text && <p className="learning-copy">{submission.answer_text}</p>}
      {submission.file_id && <Attachment id={submission.file_id} name={submission.file_name} />}
      {submission.reviewed_at && <div className="learning-feedback"><p className="portal-eyebrow">FROM YOUR TEACHER{typeof submission.score === 'number' ? ` · ${submission.score}/100` : ''}</p><p className="learning-copy">{submission.feedback || 'Your teacher has reviewed this attempt.'}</p><p className="learning-help">Reviewed {formatDate(submission.reviewed_at, timezone)}</p></div>}
      {staff && index === 0 && !submission.reviewed_at && <ReviewForm assignment={assignment} submission={submission} csrf={csrf} done={done} />}
    </div>
  </details>)}</div>
}

function AssignmentCard({ assignment, resource, submissions, staff, csrf, done, timezone, now }: { assignment: Assignment; resource?: Resource; submissions: Submission[]; staff: boolean; csrf: string; done: () => Promise<void>; timezone?: string; now: number }) {
  const overdue = assignment.due_at && Date.parse(assignment.due_at) < now && ['assigned', 'needs_revision'].includes(assignment.status)
  return <article className={`portal-panel learning-assignment learning-assignment-${assignment.status}`}>
    <div className="portal-section-heading"><p className="portal-eyebrow">{assignment.student_name}{resource?.subject ? ` / ${resource.subject}` : ''}</p><span className={`learning-status learning-status-${assignment.status}`}>{statusNames[assignment.status]}</span></div>
    <h3>{assignment.title}</h3>
    <p className={`learning-due${overdue ? ' learning-overdue' : ''}`}>{assignment.due_at ? `${overdue ? 'Past due · ' : 'Due '}${formatDate(assignment.due_at, timezone)}${timezone ? ` · ${timezone}` : ''}` : 'Practise at your own pace · no due date'}</p>
    {assignment.instructions && <p className="learning-copy">{assignment.instructions}</p>}
    {resource && <div className="learning-assigned-resource"><p className="portal-eyebrow">{kindNames[resource.kind]}</p><h4>{resource.title}</h4><ResourceContent resource={resource} /></div>}
    {!!submissions.length && <SubmissionHistory assignment={assignment} submissions={submissions} staff={staff} csrf={csrf} done={done} timezone={timezone} />}
    {!staff && ['assigned', 'needs_revision'].includes(assignment.status) && <SubmissionForm assignment={assignment} quiz={resource?.kind === 'wayground'} csrf={csrf} done={done} />}
    {!staff && assignment.status === 'submitted' && <p className="learning-help learning-receipt" role="status">Your work has been sent. Your teacher’s feedback will appear here after review.</p>}
    {staff && !submissions.length && <p className="learning-help learning-receipt">Waiting for the learner to submit their work.</p>}
  </article>
}

export function LearningHub({ user, csrf, students }: { user: User; csrf: string; students: Student[] }) {
  const [data, setData] = useState<LearningData>(blankLearning), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [tab, setTab] = useState<'homework' | 'library'>('homework'), [selectedStudent, setSelectedStudent] = useState('all'), [status, setStatus] = useState('all')
  const [search, setSearch] = useState(''), [kind, setKind] = useState('all'), [editor, setEditor] = useState<'resource' | 'assignment' | null>(null)
  const [notice, setNotice] = useState(''), [now] = useState(() => Date.now())
  const action = useAction(), moreAction = useAction(), staff = user.role === 'staff', datasetVersion = useRef(0)
  useEffect(() => {
    let active = true
    const version = ++datasetVersion.current
    api<LearningData>('/learning?page=0', null).then(value => { if (active && version === datasetVersion.current) { setData(value); setError('') } }).catch(error => { if (active) setError(messageOf(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id])
  async function reload() {
    const version = ++datasetVersion.current
    const value = await api<LearningData>('/learning?page=0', csrf)
    if (version === datasetVersion.current) { setData(value); setError('') }
  }
  async function loadMore() {
    const version = datasetVersion.current
    const value = await api<LearningData>(`/learning?page=${data.page + 1}`, csrf)
    if (version === datasetVersion.current) setData(previous => value.page === previous.page + 1 ? mergeLearningPages(previous, value) : previous)
  }
  async function done(message: string) { await reload(); setNotice(message) }
  const familyWork = data.assignments.filter(assignment => selectedStudent === 'all' || assignment.student_id === selectedStudent)
  const assignments = familyWork.filter(assignment => status === 'all' || assignment.status === status).sort((a, b) => {
    const order: Record<AssignmentStatus, number> = staff ? { submitted: 0, needs_revision: 1, assigned: 2, reviewed: 3 } : { needs_revision: 0, assigned: 1, submitted: 2, reviewed: 3 }
    return order[a.status] - order[b.status] || (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity) || Date.parse(b.created_at) - Date.parse(a.created_at)
  })
  const resources = data.resources.filter(resource => (staff || resource.visibility === 'library' || selectedStudent === 'all' || familyWork.some(assignment => assignment.resource_id === resource.id)) && (kind === 'all' || resource.kind === kind) && `${resource.title} ${resource.description} ${resource.subject} ${resource.grade}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const toDo = familyWork.filter(assignment => ['assigned', 'needs_revision'].includes(assignment.status)).length
  const waiting = familyWork.filter(assignment => assignment.status === 'submitted').length
  return <section className="learning-hub" aria-label="Homework and resource library">
    <div className="learning-intro"><div><p className="portal-eyebrow">PRACTISE · REFLECT · GROW</p><h2>{staff ? 'Keep the learning going.' : 'Little practice. Big progress.'}</h2><p>{staff ? 'Share worksheets, set the next challenge and give each learner useful feedback.' : 'Your homework, helpful resources and teacher feedback, all in one place.'}</p></div><div className="learning-overview"><div><strong>{toDo}</strong><span>to do</span></div><div><strong>{waiting}</strong><span>awaiting review</span></div></div></div>
    <div className="portal-section-heading learning-toolbar"><div className="learning-student-filter">{user.role !== 'student' && <Field label={staff ? 'Learner' : 'Child'}><select value={selectedStudent} onChange={event => setSelectedStudent(event.target.value)}><option value="all">{staff ? 'All learners' : 'All children'}</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></Field>}</div><div className="portal-actions"><button className="portal-secondary" disabled={action.busy || loading} onClick={() => { void action.run(reload) }}>{action.busy ? 'Refreshing…' : 'Refresh learning'}</button>{staff && <><button className="portal-secondary" onClick={() => setEditor(editor === 'resource' ? null : 'resource')}>+ Add resource</button><button className="portal-primary" disabled={!students.length} onClick={() => setEditor(editor === 'assignment' ? null : 'assignment')}>+ Assign homework</button></>}</div></div>
    {(error || action.error) && <p className="portal-error" role="alert">{error || action.error}</p>}
    {notice && <p className="portal-notice" role="status">{notice}</p>}
    {staff && editor === 'resource' && <ResourceForm csrf={csrf} done={() => done('Resource published. You can assign it to a learner now.')} close={() => setEditor(null)} />}
    {staff && editor === 'assignment' && <AssignmentForm students={students} resources={data.resources} csrf={csrf} done={() => done('Homework assigned. The learner and their parent can see it now.')} close={() => setEditor(null)} />}
    <nav className="portal-tabs" aria-label="Learning resources"><button aria-current={tab === 'homework' ? 'page' : undefined} onClick={() => setTab('homework')}>Homework <span>{familyWork.length}{data.hasMore ? ' loaded' : ''}</span></button><button aria-current={tab === 'library' ? 'page' : undefined} onClick={() => setTab('library')}>Resource library</button></nav>
    {!loading && data.hasMore && <p className="learning-help learning-page-note">More homework and resources are available. Counts and filters apply to the items loaded so far.</p>}
    {loading ? <p role="status">Opening your learning collection…</p> : tab === 'homework' ? <>
      <div className="learning-list-heading"><p className="learning-help">{staff ? 'New submissions appear first for your review.' : 'A new attempt is a new chance to grow.'}</p><Field label="Homework status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All homework</option>{Object.entries(statusNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field></div>
      {assignments.length ? <div className="learning-assignments">{assignments.map(assignment => <AssignmentCard key={`${assignment.id}-${assignment.version}`} assignment={assignment} resource={data.resources.find(resource => resource.id === assignment.resource_id)} submissions={data.submissions.filter(submission => submission.assignment_id === assignment.id).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))} staff={staff} csrf={csrf} done={() => done(staff ? 'Review shared with the family.' : 'Work submitted for teacher review.')} timezone={students.find(student => student.id === assignment.student_id)?.timezone} now={now} />)}</div> : <div className="portal-empty"><h3>{data.hasMore ? 'No matches in the loaded homework.' : status === 'all' ? 'Space for the next challenge.' : 'Nothing in this group yet.'}</h3><p>{data.hasMore ? 'Load more homework and resources to keep looking with these filters.' : staff ? 'Assign a worksheet, a quiz or your own practice instructions to get started.' : 'Your teacher will share homework here. In the meantime, explore your resource library.'}</p></div>}
    </> : <>
      <div className="learning-library-tools"><Field label="Find a resource"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, subject or grade" /></Field><Field label="Resource type"><select value={kind} onChange={event => setKind(event.target.value)}><option value="all">All resources</option>{Object.entries(kindNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field></div>
      <p className="learning-help learning-library-caption">{staff ? 'Your reusable teaching collection. Assigned resources stay private to the learners who receive them.' : 'Browse shared resources and materials assigned to your family. Homework submissions belong in the Homework tab.'}</p>
      {resources.length ? <div className="learning-resources">{resources.map(resource => <article className="portal-panel learning-resource" key={resource.id}><div className="portal-section-heading"><p className="portal-eyebrow">{kindNames[resource.kind]}</p><span className="portal-tag">{resource.visibility === 'library' ? 'Shared library' : 'Assigned access'}</span></div><h3>{resource.title}</h3><p className="learning-due">{[resource.subject, resource.grade].filter(Boolean).join(' · ')}</p><ResourceContent resource={resource} />{staff && !resource.published && <p className="learning-help">Unpublished · visible only to staff</p>}</article>)}</div> : <div className="portal-empty"><h3>{data.hasMore ? 'No matches in the loaded resources.' : search || kind !== 'all' ? 'No matching resources.' : 'A collection ready to grow.'}</h3><p>{data.hasMore ? 'Load more homework and resources to search the rest of your collection.' : search || kind !== 'all' ? 'Try another title, subject or grade, or choose all resource types.' : staff ? 'Add your first worksheet, reference or Wayground quiz.' : 'Resources shared by your teaching team will appear here.'}</p></div>}
    </>}
    {!loading && <div className="learning-pagination">{moreAction.error && <p className="portal-error" role="alert">{moreAction.error}</p>}{data.hasMore && <button className="portal-secondary" disabled={moreAction.busy || action.busy} onClick={() => { void moreAction.run(loadMore) }}>{moreAction.busy ? 'Loading more…' : 'Load more homework and resources'}</button>}</div>}
  </section>
}
