import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
export const LabActivity = createContext(false)
// Visibility-gated animation clock; no React renders per frame.
export function useLabClock(tick: (seconds: number) => void, playing = true) {
  const active = useContext(LabActivity)
  const callback = useRef(tick), elapsed = useRef(0)
  useEffect(() => { callback.current = tick }, [tick])
  useEffect(() => {
    if (!active || !playing) return
    let id = 0, last = 0
    const frame = (now: number) => {
      if (last) elapsed.current += Math.min((now - last) / 1000, .05)
      last = now; callback.current(elapsed.current); id = requestAnimationFrame(frame)
    }
    id = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(id)
  }, [active, playing])
}
export function LabSvg({ children, label, className = '' }: { children: ReactNode | ((paint: (color: string) => string) => ReactNode); label: string; className?: string }) {
  const id = useId().replaceAll(':', '')
  const colors = { orange: ['#ffbe64', '#ff7028', '#b93d13'], blue: ['#8dcfff', '#316bed', '#1d349d'], violet: ['#d5bbff', '#8953dc', '#4f239b'], mint: ['#a1edc7', '#42b98b', '#227c60'] }
  return <svg className={`lab-svg ${className}`} viewBox="0 0 300 132" role="img" aria-label={label}><defs>{Object.entries(colors).map(([color, stops]) => <radialGradient key={color} id={`${id}-${color}`} cx="32%" cy="20%" r="90%">{stops.map((stop, i) => <stop key={stop} offset={`${i * 50}%`} stopColor={stop} />)}</radialGradient>)}</defs>{typeof children === 'function' ? children(color => `url(#${id}-${color})`) : children}</svg>
}
export function Slider({ label, value, min, max, step = 1, display, onChange }: { label: string; value: number; min: number; max: number; step?: number; display?: string; onChange: (v: number) => void }) {
  const { automatic } = useLabDemo()
  return <label className="lab-slider"><span>{label}<output aria-live={automatic ? 'off' : 'polite'}>{display ?? value}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}
export function PlayButton({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return <button className="lab-button" data-play-control aria-label={`${playing ? 'Pause' : 'Run'} ${label}`} aria-pressed={playing} onClick={onClick}>{playing ? 'Pause' : 'Run'}</button>
}

export const LabDemo = createContext<{ automatic: boolean; takeControl: () => void; isAutomatic: () => boolean }>({ automatic: false, takeControl: () => {}, isAutomatic: () => false })
export const useLabDemo = () => useContext(LabDemo)

// One value drives the drawing, native slider and readout together. Manual input
// stops the demo synchronously, so an already queued frame cannot overwrite it.
export function useLoopValue(initial: number, { min, max, step = 1, period = 12, cycle = false }: { min: number; max: number; step?: number; period?: number; cycle?: boolean }) {
  const [value, setValue] = useState(initial)
  const { automatic, takeControl, isAutomatic } = useLabDemo()
  const phase = useRef(cycle ? (initial - min) / (max - min + step) * Math.PI * 2 : Math.acos(1 - 2 * (initial - min) / (max - min)))
  const lastTime = useRef(0), lastPaint = useRef(0)
  useLabClock(t => {
    const dt = t - lastTime.current
    lastTime.current = t
    if (!isAutomatic()) return
    phase.current += dt * Math.PI * 2 / period
    if (t - lastPaint.current < 1 / 30) return
    lastPaint.current = t
    const raw = cycle
      ? min + Math.floor(((phase.current % (Math.PI * 2)) / (Math.PI * 2)) * ((max - min) / step + 1)) * step
      : min + (1 - Math.cos(phase.current)) / 2 * (max - min)
    const next = Number(Math.max(min, Math.min(max, min + Math.round((raw - min) / step) * step)).toFixed(3))
    setValue(previous => previous === next ? previous : next)
  }, automatic)
  const change = (next: number) => {
    takeControl()
    phase.current = cycle ? (next - min) / (max - min + step) * Math.PI * 2 : Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (next - min) / (max - min))))
    setValue(next)
  }
  return [value, change] as const
}
