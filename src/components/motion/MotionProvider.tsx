import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const storageKey = 'stemify:reduce-motion'
interface MotionPreferences {
  reduced: boolean
  systemReduced: boolean
  userReduced: boolean
  setUserReduced: (value: boolean) => void
}
export const MotionContext = createContext<MotionPreferences | null>(null)

export function MotionProvider({ children }: { children: ReactNode }) {
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [userReduced, setUserReduced] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true' } catch { return false }
  })
  const reduced = systemReduced || userReduced
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
    return () => { delete document.documentElement.dataset.motion }
  }, [reduced])
  useEffect(() => {
    try { localStorage.setItem(storageKey, String(userReduced)) } catch { /* private storage: session preference still works */ }
  }, [userReduced])
  const value = useMemo(() => ({ reduced, systemReduced, userReduced, setUserReduced }), [reduced, systemReduced, userReduced])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}
