import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from './api'
import type { Session, Dashboard, Student, Lesson } from './api'
import './portal.css'
import { LearningHub } from './LearningHub'

const blankDashboard: Dashboard = { students: [], classes: [] }
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'
const dateLabel = (lesson: Lesson) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: lesson.timezone }).format(new Date(lesson.starts_at))
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="portal-field"><span>{label}</span>{children}</label> }
function Empty({ children }: { children: ReactNode }) { return <div className="portal-empty">{children}</div> }
function useAction() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function run(work: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError('')
    try { await work() } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return { busy, error, run }
}
function Auth({ session, onSession }: { session: Session; onSession: (value: Session) => void }) {
  const [link] = useState(() => new URLSearchParams(window.location.hash.slice(1)))
  const [mode, setMode] = useState(link.has('verify') ? 'verify' : link.has('reset') ? 'reset' : 'login')
  const [notice, setNotice] = useState('')
  const action = useAction()
  useEffect(() => { if (window.location.hash) history.replaceState(null, '', '/portal') }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    await action.run(async () => {
      setNotice('')
      if (mode === 'login') onSession(await api<Session>('/auth/login', session.csrf, values))
      else {
        const body = mode === 'verify' || mode === 'reset' ? { ...values, token: link.get(mode) } : values
        const result = await api<{ message: string }>(`/auth/${mode}`, session.csrf, body)
        setNotice(result.message)
        if (mode === 'reset' || mode === 'verify') setMode('login')
      }
    })
  }
  const title = ({ login: 'Welcome back.', register: 'A brighter learning journey.', 'request-reset': 'Let’s get you back in.', 'request-verify': 'Check your inbox.', verify: 'Verify your email.', reset: 'Choose a new password.' } as Record<string, string>)[mode]
  return <div className="portal-auth-layout"><section className="portal-intro"><p className="portal-eyebrow">THE STEMIFY WAY / FAMILY PORTAL</p><h1>Small steps.<br /><em>Extraordinary</em><br />possibilities.</h1><p>One place for the next lesson, the latest progress and everything in between.</p><div className="portal-path"><span>01 <b>Prepare</b></span><span>02 <b>Discover</b></span><span>03 <b>Grow</b></span></div><p className="portal-caption">A little more confidence, every class.</p></section>
    <section className="portal-panel portal-auth"><p className="portal-eyebrow">PARENTS & STUDENTS</p><h2>{title}</h2><p>{mode === 'login' ? 'Parents use their email. Students use the username created by their parent.' : mode === 'register' ? 'Create your parent account, then add your children and their own logins.' : mode === 'verify' ? 'Confirm your email to activate your family account.' : 'We’ll help you access your account securely.'}</p>
      <form onSubmit={submit} key={mode}>
        {mode === 'register' && <Field label="Your name"><input name="name" autoComplete="name" required maxLength={100} /></Field>}
        {mode === 'login' && <Field label="Email or student username"><input name="identifier" autoComplete="username" required maxLength={254} /></Field>}
        {['register', 'request-reset', 'request-verify'].includes(mode) && <Field label="Parent email"><input name="email" type="email" autoComplete="email" required maxLength={254} /></Field>}
        {['register', 'login', 'reset'].includes(mode) && <Field label={mode === 'login' ? 'Password' : 'Password · at least 12 characters'}><input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} /></Field>}
        {action.error && <p className="portal-error" role="alert">{action.error}</p>}{notice && <p className="portal-notice" role="status">{notice}</p>}
        <button className="portal-primary" disabled={action.busy}>{action.busy ? 'Please wait…' : ({ login: 'Sign in →', register: 'Create parent account →', verify: 'Verify email →', reset: 'Save new password →' } as Record<string, string>)[mode] || 'Send email →'}</button>
      </form>
      <div className="portal-auth-links"><button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice('') }}>{mode === 'login' ? 'New here? Create a parent account' : 'Back to sign in'}</button>{mode === 'login' && <><button onClick={() => setMode('request-reset')}>Forgot password?</button><button onClick={() => setMode('request-verify')}>Resend verification email</button><a href="/join">Have a quiz code? Join a quiz →</a></>}</div>
    </section></div>
}
function StudentForm({ csrf, done }: { csrf: string; done: () => Promise<void> }) {
  const action = useAction()
  return <form className="portal-panel" onSubmit={event => {
    event.preventDefault(); const form = event.currentTarget; const body = Object.fromEntries(new FormData(form))
    void action.run(async () => { await api('/students', csrf, body); form.reset(); await done() })
  }}><h3>Add a child</h3><div className="portal-form-grid"><Field label="Child’s name"><input name="name" required maxLength={100} /></Field><Field label="Grade"><select name="grade" required><option value="">Choose a grade</option>{['Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Time zone"><select name="timezone" defaultValue="America/Toronto">{['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns', 'UTC'].map(x => <option key={x}>{x}</option>)}</select></Field></div>{action.error && <p role="alert" className="portal-error">{action.error}</p>}<button className="portal-primary" disabled={action.busy}>{action.busy ? 'Adding…' : 'Add child'}</button></form>
}
function ChildLogin({ student, csrf, done }: { student: Student; csrf: string; done: () => Promise<void> }) {
  const action = useAction(), [notice, setNotice] = useState('')
  return <details className="portal-child-login"><summary>{student.account_id ? `Manage login · ${student.login_name}` : 'Create student login'}</summary><form onSubmit={event => {
    event.preventDefault(); const form = event.currentTarget; const body = Object.fromEntries(new FormData(form))
    void action.run(async () => { const result = await api<{ message: string }>(`/students/${student.id}/login`, csrf, body); form.reset(); setNotice(result.message); await done() })
  }}><Field label="Student username"><input name="username" defaultValue={student.login_name || ''} pattern="[a-zA-Z][a-zA-Z0-9._\-]{3,39}" autoComplete="off" required minLength={4} maxLength={40} /></Field><Field label="New password · at least 12 characters"><input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></Field><button className="portal-primary" disabled={action.busy}>Save student login</button></form>{student.account_id && <button className="portal-text-button" disabled={action.busy} onClick={() => { void action.run(async () => { await api(`/students/${student.id}/login`, csrf, {}, 'DELETE'); setNotice('Student login disabled. Their class history is retained.'); await done() }) }}>Disable student login</button>}{notice && <p role="status" className="portal-notice">{notice}</p>}{action.error && <p role="alert" className="portal-error">{action.error}</p>}</details>
}
function ClassForm({ students, lesson, csrf, done, close }: { students: Student[]; lesson?: Lesson; csrf: string; done: () => Promise<void>; close: () => void }) {
  const action = useAction()
  const localStart = lesson ? new Date(new Date(lesson.starts_at).getTime() - new Date(lesson.starts_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  return <form className="portal-panel portal-editor" onSubmit={event => {
    event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget))
    const body = { ...f, studentId: lesson?.student_id || f.studentId, startsAt: new Date(String(f.startsAt)).toISOString(), durationMinutes: Number(f.durationMinutes), ...(lesson ? { version: lesson.version } : {}) }
    void action.run(async () => { await api(lesson ? `/classes/${lesson.id}` : '/classes', csrf, body, lesson ? 'PUT' : 'POST'); await done(); close() })
  }}><div className="portal-section-heading"><h3>{lesson ? 'Edit class' : 'Schedule a class'}</h3><button type="button" className="portal-text-button" onClick={close}>Close</button></div>
    <div className="portal-form-grid"><Field label="Student"><select name="studentId" required defaultValue={lesson?.student_id || ''} disabled={Boolean(lesson)}><option value="">Choose a student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} · {s.parent_email}</option>)}</select></Field><Field label="Class title"><input name="title" required defaultValue={lesson?.title} maxLength={100} /></Field><Field label="Subject"><input name="subject" required defaultValue={lesson?.subject} maxLength={100} /></Field><Field label="Teacher"><input name="teacher" required defaultValue={lesson?.teacher} maxLength={100} /></Field><Field label={`Start · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}><input name="startsAt" type="datetime-local" required defaultValue={localStart} /></Field><Field label="Minutes"><input name="durationMinutes" type="number" min={10} max={240} required defaultValue={lesson?.duration_minutes || 60} /></Field><Field label="Status"><select name="status" defaultValue={lesson?.status || 'scheduled'}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field><Field label="Zoom join link"><input name="joinUrl" type="url" defaultValue={lesson?.join_url} placeholder="https://…zoom.us/j/…" maxLength={2000} /></Field><Field label="Zoom meeting ID · no spaces"><input name="zoomMeetingId" inputMode="numeric" pattern="[0-9]{9,11}|" defaultValue={lesson?.zoom_meeting_id} /></Field></div>
    <details><summary>Meeting instance (optional)</summary><p>Usually linked automatically when the meeting starts. Enter the exact Zoom meeting UUID only when resolving an unmatched summary.</p><Field label="Meeting UUID"><input name="zoomUuid" defaultValue={lesson?.zoom_uuid || ''} maxLength={200} /></Field></details>
    <Field label="Prepare for this class"><textarea name="preparation" defaultValue={lesson?.preparation} maxLength={5000} rows={3} /></Field>{action.error && <p role="alert" className="portal-error">{action.error}</p>}<button className="portal-primary" disabled={action.busy}>{action.busy ? 'Saving…' : 'Save class'}</button>
  </form>
}
function NotesEditor({ lesson, csrf, done }: { lesson: Lesson; csrf: string; done: () => Promise<void> }) {
  const action = useAction(), [notice, setNotice] = useState(''), [dirty, setDirty] = useState(false)
  return <details className="portal-notes-editor"><summary>Review lesson notes {lesson.note_version !== lesson.published_version && <span className="portal-tag">Draft</span>}</summary><p className="portal-meta">Source: {lesson.source || 'Teacher'} · Check AI notes for accuracy before sharing.</p><form key={lesson.note_version} onSubmit={event => {
    event.preventDefault(); const body = { ...Object.fromEntries(new FormData(event.currentTarget)), version: lesson.note_version }
    void action.run(async () => { await api(`/classes/${lesson.id}/notes`, csrf, body, 'PUT'); await done(); setDirty(false); setNotice('Draft saved. You can publish it now.') })
  }}><Field label="Class summary"><textarea name="summary" rows={6} maxLength={30000} defaultValue={lesson.draft_summary} onChange={() => setDirty(true)} /></Field><Field label="Practice & next steps"><textarea name="nextSteps" rows={3} maxLength={10000} defaultValue={lesson.draft_next_steps} onChange={() => setDirty(true)} /></Field><div className="portal-actions"><button className="portal-secondary" disabled={action.busy}>Save draft</button><button type="button" className="portal-primary" disabled={action.busy || dirty || !lesson.draft_summary} onClick={() => { void action.run(async () => { await api(`/classes/${lesson.id}/publish`, csrf, { version: lesson.note_version }); await done(); setNotice('Published to the family portal.') }) }}>Publish to family</button></div>{dirty && <p className="portal-meta">Save your changes before publishing.</p>}</form>{notice && <p role="status" className="portal-notice">{notice}</p>}{action.error && <p role="alert" className="portal-error">{action.error}</p>}</details>
}
function LessonCard({ lesson, staff, csrf, reload, edit }: { lesson: Lesson; staff: boolean; csrf: string; reload: () => Promise<void>; edit: () => void }) {
  return <article className={`portal-panel portal-lesson ${lesson.status === 'cancelled' ? 'portal-cancelled' : ''}`}><div className="portal-section-heading"><p className="portal-eyebrow">{lesson.subject} / {lesson.student_name}</p><span className="portal-tag">{lesson.status}</span></div><h3>{lesson.title}</h3><p className="portal-date">{dateLabel(lesson)}</p><p className="portal-meta">{lesson.duration_minutes} minutes · {lesson.teacher} · {lesson.timezone}</p>{lesson.preparation && <div className="portal-preparation"><h4>Before we meet</h4><p>{lesson.preparation}</p></div>}
    {lesson.status === 'scheduled' && lesson.join_url && <a className="portal-primary" href={lesson.join_url} target="_blank" rel="noopener noreferrer">Join Zoom class ↗</a>}
    {lesson.published_at ? <div className="portal-published"><h4>What we learned</h4><p>{lesson.published_summary}</p>{lesson.published_next_steps && <><h4>Keep the momentum</h4><p>{lesson.published_next_steps}</p></>}<small>Reviewed by your teaching team</small></div> : lesson.status !== 'cancelled' && <p className="portal-meta">Lesson notes will appear here after your teacher shares them.</p>}
    {staff && <><button className="portal-text-button" onClick={edit}>Edit class details</button><NotesEditor key={lesson.id} lesson={lesson} csrf={csrf} done={reload} /></>}
  </article>
}
export function Portal() {
  const [section, setSection] = useState<'classes' | 'learning'>('classes')
  const [forceAuth, setForceAuth] = useState(() => /(?:verify|reset)=/.test(window.location.hash))
  const [now] = useState(() => Date.now())
  const [session, setSession] = useState<Session>({ user: null, csrf: null }), [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<Dashboard>(blankDashboard), [error, setError] = useState(''), [selected, setSelected] = useState('all')
  const [tab, setTab] = useState('upcoming'), [addingStudent, setAddingStudent] = useState(false), [editor, setEditor] = useState<Lesson | 'new' | null>(null)
  const action = useAction()
  useEffect(() => { document.title = 'Family portal · STEMIFY'; api<Session>('/session', null).then(setSession).catch(e => setError(messageOf(e))).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!session.user?.verified) return
    let active = true
    api<Dashboard>('/dashboard', null).then(value => { if (active) { setDashboard(value); setError('') } }).catch(e => { if (active) setError(messageOf(e)) })
    return () => { active = false }
  }, [session])
  async function reload() { const data = await api<Dashboard>('/dashboard', session.csrf); setDashboard(data); setError('') }
  const user = session.user, csrf = session.csrf || '', staff = user?.role === 'staff'
  const filtered = dashboard.classes.filter(c => selected === 'all' || c.student_id === selected)
  const upcoming = filtered.filter(c => c.status === 'scheduled' && new Date(c.starts_at).getTime() + c.duration_minutes * 60000 >= now).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const history = filtered.filter(c => !upcoming.includes(c))
  const shown = tab === 'upcoming' ? upcoming : history
  const reviewCount = dashboard.classes.filter(c => c.draft_summary && c.note_version !== c.published_version).length
  return <div className="portal"><header className="portal-header"><a className="portal-logo" href="/">STEMIFY<span>®</span></a><span className="portal-header-label">{staff ? 'Teaching desk' : 'Family portal'}</span>{user && <button className="portal-text-button" disabled={action.busy} onClick={() => { void action.run(async () => { await api('/auth/logout', csrf, {}); setSession({ user: null, csrf: null }); setDashboard(blankDashboard); setSelected('all'); setEditor(null); setSection('classes'); setError('') }) }}>Sign out</button>}</header>
    <main className="portal-main">{(error || action.error) && <p className="portal-error" role="alert">{error || action.error}</p>}{loading ? <p role="status">Opening your portal…</p> : !user || forceAuth ? <Auth session={session} onSession={value => { setSession(value); setForceAuth(false); setTab('upcoming'); window.scrollTo({top:0,behavior:'instant'}) }} /> : !user.verified ? <section className="portal-panel"><h1>One quick check.</h1><p>Verify your email using the link in your inbox, then refresh this page.</p><button className="portal-primary" disabled={action.busy} onClick={() => { void action.run(async () => { await api('/auth/request-verify', csrf, { email: user.email }); setError('Verification email requested. Check your inbox.') }) }}>Resend verification</button></section> : <>
      <section className="portal-welcome"><div><p className="portal-eyebrow">{staff ? 'TEACH · REFLECT · KEEP GROWING' : 'YOUR LEARNING, ALL TOGETHER'}</p><h1>{staff ? 'A clear view of every learner.' : `Hello, ${user.name.split(' ')[0]}.`}</h1><p>{staff ? 'Plan the next class. Share the progress that matters.' : user.role === 'student' ? 'Your next discovery starts here.' : 'Good things happen one class at a time.'}</p></div><div className="portal-stat"><strong>{staff ? reviewCount : upcoming.length.toString().padStart(2, '0')}</strong><span>{staff ? 'notes to review' : 'upcoming classes'}</span></div></section>
      <nav className="portal-tabs" aria-label="Portal sections"><button aria-current={section === 'classes' ? 'page' : undefined} onClick={() => setSection('classes')}>Classes & notes</button><button aria-current={section === 'learning' ? 'page' : undefined} onClick={() => setSection('learning')}>Homework & library</button><a href="/join">Join a quiz →</a></nav>
      {section === 'learning' ? <LearningHub key={user.id} user={user} csrf={csrf} students={dashboard.students} /> : <>
      {staff && <section className="portal-integration"><strong>Zoom notes</strong><span>{dashboard.integration?.configured ? 'Webhook ready' : 'Setup needed · connect your Zoom app to receive AI summaries'}</span>{dashboard.integration?.counts.filter(x => x.count > 0).map(x => <span key={x.status}>{x.count} {x.status}</span>)}{dashboard.integration?.state.last_received && <span>Last received {new Date(dashboard.integration.state.last_received).toLocaleString()}</span>}</section>}
      {staff && Boolean(dashboard.integration?.unresolved.length) && <details className="portal-panel portal-unresolved"><summary>Resolve unmatched Zoom notes</summary><p>Check the meeting and student, then edit the correct class and enter its meeting UUID. Saving retries the receipt. Never attach a shared meeting summary to an individual learner without reviewing it.</p>{dashboard.integration?.unresolved.map(event => <div key={event.id}><strong>{event.status} · {event.event_type}</strong><p>Meeting {event.meeting_id || 'unknown'} · {event.starts_at || 'start unavailable'}</p><p>Meeting UUID: <code>{event.meeting_uuid}</code></p></div>)}</details>}
      <div className="portal-section-heading"><div className="portal-filters"><Field label={staff ? 'Learner' : 'Student'}><select value={selected} onChange={e => setSelected(e.target.value)}><option value="all">{user.role === 'student' ? 'My learning' : 'All students'}</option>{dashboard.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></div><div className="portal-actions"><button className="portal-secondary" disabled={action.busy} onClick={() => { void action.run(reload) }}>Refresh</button>{user.role === 'parent' && <button className="portal-primary" onClick={() => setAddingStudent(!addingStudent)}>{addingStudent ? 'Close form' : '+ Add child'}</button>}{staff && <button className="portal-primary" onClick={() => setEditor('new')} disabled={!dashboard.students.length}>+ Schedule class</button>}</div></div>
      {addingStudent && user.role === 'parent' && <StudentForm csrf={csrf} done={async () => { await reload(); setAddingStudent(false) }} />}
      {user.role === 'parent' && <div className="portal-students">{dashboard.students.filter(s => selected === 'all' || s.id === selected).map(s => <section className="portal-panel portal-student" key={s.id}><div className="portal-avatar" aria-hidden="true">{s.name.slice(0, 1)}</div><div><h3>{s.name}</h3><p className="portal-meta">{s.grade}</p><ChildLogin student={s} csrf={csrf} done={reload} /></div></section>)}</div>}
      {staff && editor && <ClassForm key={editor === 'new' ? 'new' : `${editor.id}-${editor.version}`} students={dashboard.students} lesson={editor === 'new' ? undefined : editor} csrf={csrf} done={reload} close={() => setEditor(null)} />}
      <nav className="portal-tabs" aria-label="Classes"><button aria-current={tab === 'upcoming' ? 'page' : undefined} onClick={() => setTab('upcoming')}>Coming up <span>{upcoming.length}</span></button><button aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>Past classes & notes <span>{history.length}</span></button></nav>
      {shown.length ? <div className="portal-lessons">{shown.map(c => <LessonCard key={c.id} lesson={c} staff={staff} csrf={csrf} reload={reload} edit={() => { setEditor(c); window.scrollTo({ top: 0, behavior: 'instant' }) }} />)}</div> : <Empty><h3>{dashboard.students.length ? 'Room for the next discovery.' : user.role === 'parent' ? 'Let’s meet your learner.' : 'Your learning space is ready.'}</h3><p>{!dashboard.students.length && user.role === 'parent' ? 'Add your child to get started. Your teaching team will schedule their classes here.' : tab === 'upcoming' ? 'No upcoming classes yet. Your teaching team will add the next lesson here.' : 'Completed classes and teacher-reviewed notes will appear here.'}</p></Empty>}
      </>}
    </>}</main><footer className="portal-footer"><span>STEMIFY · Curiosity today. Confidence for life.</span><a href="/">Back to the website ↗</a></footer></div>
}
