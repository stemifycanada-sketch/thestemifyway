import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './portal.css'
import './join-quiz.css'

export function JoinQuizPage() {
  const [code, setCode] = useState(''), [error, setError] = useState(''), [opened, setOpened] = useState(false)
  useEffect(() => { document.title = 'Join a quiz · STEMIFY' }, [])

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const gameCode = code.trim()
    if (!/^[0-9]+$/.test(gameCode)) {
      setError(gameCode ? 'Use only the numbers in the game code from your teacher.' : 'Enter the game code from your teacher.')
      setOpened(false)
      return
    }
    const url = `https://wayground.com/join?${new URLSearchParams({ gc: gameCode })}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setError('')
    setOpened(true)
  }

  return <div className="portal join-quiz-page">
    <header className="portal-header join-quiz-header">
      <a className="portal-logo" href="/" aria-label="STEMIFY home">STEMIFY<span aria-hidden="true">®</span></a>
      <span className="portal-header-label">A LITTLE CURIOSITY GOES A LONG WAY</span>
      <a className="portal-text-button" href="/portal">Family portal ↗</a>
    </header>
    <main className="portal-main join-quiz-main">
      <section className="join-quiz-intro" aria-labelledby="join-quiz-heading">
        <p className="portal-eyebrow">READY, SET, DISCOVER</p>
        <h1 id="join-quiz-heading">Your next <br /><em>challenge</em> <br />starts here.</h1>
        <p>A little practice. A new discovery. Bring your curiosity and the game code from your teacher.</p>
        <div className="join-quiz-steps" aria-label="How to join">
          <div><span aria-hidden="true">01</span><p>Enter your code.</p></div>
          <div><span aria-hidden="true">02</span><p>Join on Wayground.</p></div>
          <div><span aria-hidden="true">03</span><p>Give it a go.</p></div>
        </div>
      </section>
      <section className="portal-panel join-quiz-card" aria-labelledby="join-code-heading">
        <div className="join-quiz-mark" aria-hidden="true">?</div>
        <p className="portal-eyebrow">LET’S GET STARTED</p>
        <h2 id="join-code-heading">Have a game code?</h2>
        <p className="join-quiz-description" id="join-code-help">Use the active Wayground code your teacher shared with you.</p>
        <form onSubmit={join} noValidate>
          <label className="portal-field" htmlFor="join-game-code"><span>Game code</span></label>
          <input id="join-game-code" className="join-quiz-code" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={32} required value={code} placeholder="Enter your code" aria-describedby={`join-code-help${error ? ' join-code-error' : ''}`} aria-invalid={error ? true : undefined} onChange={event => { setCode(event.target.value); setError(''); setOpened(false) }} />
          {error && <p id="join-code-error" className="portal-error" role="alert">{error}</p>}
          <button className="portal-primary" type="submit">Join on Wayground ↗</button>
          <p className="join-quiz-hint">Opens in a new tab. Wayground may ask for your name or student login.</p>
          {opened && <p className="portal-notice" role="status">Continue in the Wayground tab. If it did not open, allow new tabs in your browser and try again.</p>}
        </form>
        <div className="join-quiz-help"><h3>Need a hand?</h3><p>If the code has expired or does not work, ask your teacher for a new one.</p></div>
      </section>
    </main>
    <footer className="portal-footer"><span>STEMIFY · Curiosity today. Confidence for life.</span><a href="/">Back to the website ↗</a></footer>
  </div>
}
