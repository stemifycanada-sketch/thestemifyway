import { lazy, Suspense } from 'react'
const Portal = lazy(() => import('../portal/Portal').then(module => ({ default: module.Portal })))
const JoinQuiz = lazy(() => import('../portal/JoinQuiz').then(module => ({ default: module.JoinQuizPage })))
const StemifyWay = lazy(() => import('./StemifyWay').then(module => ({ default: module.StemifyWay })))
export function App() {
  const path = window.location.pathname
  return <Suspense fallback={<p role="status">Loading Stemify…</p>}>{path === '/join' || path === '/join/' ? <JoinQuiz /> : path.startsWith('/portal') ? <Portal /> : <StemifyWay />}</Suspense>
}
