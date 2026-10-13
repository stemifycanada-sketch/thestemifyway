import { lazy, Suspense } from 'react'
const Portal = lazy(() => import('../portal/Portal').then(module => ({ default: module.Portal })))
const StemifyWay = lazy(() => import('./StemifyWay').then(module => ({ default: module.StemifyWay })))
export function App() {
  return <Suspense fallback={<p role="status">Loading Stemify…</p>}>{window.location.pathname.startsWith('/portal') ? <Portal /> : <StemifyWay />}</Suspense>
}
