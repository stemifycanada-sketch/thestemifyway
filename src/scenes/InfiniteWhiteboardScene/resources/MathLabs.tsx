import { useState } from 'react'
import { LabSvg, Slider, useLabDemo, useLoopValue } from './LabPrimitives'
export function FractionLab() {
  const [parts, setParts] = useLoopValue(3, { min: 0, max: 8, period: 12 })
  return <><div className="lab-visual"><LabSvg label={`${parts} of eight equal parts selected`}>{paint => <><circle cx="119" cy="70" r="57" fill="#263268" opacity=".1" />{Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4 - Math.PI / 2, b = a + Math.PI / 4
    const x = (t: number) => 119 + 56 * Math.cos(t), y = (t: number) => 64 + 56 * Math.sin(t)
    return <path key={i} d={`M119 64L${x(a)} ${y(a)}A56 56 0 0 1 ${x(b)} ${y(b)}Z`} fill={paint(i < parts ? 'orange' : 'blue')} stroke="#fff7ee" strokeWidth="2.5" />
  })}<text x="225" y="56" className="lab-number">{parts}</text><path d="M208 66h34" stroke="#443c35" strokeWidth="2" /><text x="225" y="99" className="lab-number">8</text></>}</LabSvg></div><Slider label="Fraction numerator" min={0} max={8} value={parts} display={`${parts}/8`} onChange={setParts} /></>
}
export function GeometryLab() {
  const [angle, setAngle] = useLoopValue(60, { min: 10, max: 170, period: 16 })
  const point = (r: number, a: number) => [150 + r * Math.cos(a * Math.PI / 180), 113 - r * Math.sin(a * Math.PI / 180)]
  const end = point(101, angle), arc = point(35, angle)
  return <><div className="lab-visual"><LabSvg label={`An angle of ${angle} degrees`}>{paint => <><path d="M43 115a107 107 0 0 1 214 0Z" fill={paint('orange')} /><path d="M84 115a66 66 0 0 1 132 0Z" fill="#fff6e3" />{Array.from({ length: 19 }, (_, i) => { const a = i * 10, p = point(99, a), q = point(i % 3 === 0 ? 86 : 92, a); return <g key={i}><line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#7b381a" />{i % 3 === 0 && <text x={point(77, a)[0]} y={point(77, a)[1] + 3} fontSize="8" textAnchor="middle" fill="#70351c">{a}</text>}</g> })}<path d={`M249 113H150L${end[0]} ${end[1]}`} stroke={paint('blue')} strokeWidth="6" strokeLinecap="round" fill="none" /><path d={`M185 113A35 35 0 0 0 ${arc[0]} ${arc[1]}`} fill="none" stroke="#8953dc" strokeWidth="3" /><circle cx="150" cy="113" r="7" fill={paint('blue')} /></>}</LabSvg></div><Slider label="Angle" min={10} max={170} value={angle} display={`${angle}°`} onChange={setAngle} /></>
}
export function QuizLab() {
  const [answer, setAnswer] = useState<number | null>(null)
  const [preview] = useLoopValue(0, { min: 0, max: 2, period: 9 })
  const { automatic, takeControl } = useLabDemo()
  return <div className="lab-quiz quiz-lab"><p>Which fraction equals one half?</p><div className="fraction-answers">{['2/3', '3/6', '1/4'].map((a, i) => <button key={a} aria-label={a} aria-pressed={!automatic && answer === i} data-preview={automatic && preview === i} onClick={() => { takeControl(); setAnswer(i) }}><span aria-hidden="true">{a.split('/')[0]}</span><span aria-hidden="true">{a.split('/')[1]}</span></button>)}</div><p role="status">{automatic || answer === null ? 'Choose a fraction.' : answer === 1 ? 'Exactly. Three of six equal parts.' : 'Not quite. Look for equal halves.'}</p></div>
}
export function BalanceLab() {
  const [weight, setWeight] = useLoopValue(3, { min: 0, max: 6, period: 14 })
  const angle = (3 - weight) * 4
  return <><div className="lab-visual"><LabSvg label={`${weight} units on the left, three on the right${weight === 3 ? ', balanced' : ''}`}>{paint => <><path d="M128 123l22-48 22 48Z" fill={paint('orange')} /><g transform={`rotate(${angle} 150 63)`}><rect x="38" y="62" width="224" height="9" rx="4" fill={paint('violet')} />{Array.from({ length: weight }, (_, i) => <rect key={i} x={50 + i % 3 * 19} y={42 - Math.floor(i / 3) * 20} width="17" height="19" rx="4" fill={paint('orange')} />)}{[0, 1, 2].map(i => <rect key={i} x={191 + i * 19} y="42" width="17" height="19" rx="4" fill={paint('blue')} />)}</g><text x="150" y="25" className="lab-equation">{weight} {weight === 3 ? '=' : weight < 3 ? '<' : '>'} 3</text></>}</LabSvg></div><Slider label="Units on the left" value={weight} min={0} max={6} display={weight === 3 ? '3 · balanced' : String(weight)} onChange={setWeight} /></>
}
export function BlocksLab() {
  const [number, setNumber] = useLoopValue(14, { min: 0, max: 30, period: 18 })
  const tens = Math.floor(number / 10), ones = number % 10
  return <><div className="lab-visual"><LabSvg label={`${number}: ${tens} tens and ${ones} ones`}>{paint => <>{[0, 1, 2].slice(0, tens).map(i => <g key={i}>{Array.from({ length: 10 }, (_, j) => <rect key={j} x={39 + i * 26} y={9 + j * 11} width="21" height="10" rx="2" fill={paint('orange')} />)}</g>)}{Array.from({ length: ones }, (_, i) => <rect key={i} x={163 + i % 3 * 28} y={22 + Math.floor(i / 3) * 29} width="24" height="24" rx="5" fill={paint('blue')} />)}<text x="92" y="131" textAnchor="middle" fontSize="9" fill="#6b5d49">{tens} TENS</text><text x="203" y="131" textAnchor="middle" fontSize="9" fill="#6b5d49">{ones} ONES</text></>}</LabSvg></div><Slider label="Build a number" value={number} min={0} max={30} onChange={setNumber} /></>
}
export function GraphLab() {
  const [a, setA] = useLoopValue(1, { min: .25, max: 2, step: .01, period: 13 })
  const d = Array.from({ length: 81 }, (_, i) => { const x = (i - 40) / 10; return `${i ? 'L' : 'M'}${150 + x * 28} ${108 - a * x * x * 12}` }).join(' ')
  return <><div className="lab-visual"><LabSvg label={`Parabola y equals ${a} x squared`}><g className="lab-graph-grid">{[38, 66, 94, 122, 150, 178, 206, 234, 262].map(x => <line key={x} x1={x} x2={x} y1="8" y2="125" />)}{[12, 36, 60, 84, 108].map(y => <line key={y} x1="30" x2="270" y1={y} y2={y} />)}</g><path d="M30 108H275M150 125V8" stroke="#a2a0a3" fill="none" /><path d={d} stroke="#f46e2b" strokeWidth="5" fill="none" strokeLinecap="round" /><text x="259" y="123" fontSize="10">x</text><text x="163" y="17" fontSize="10">y</text></LabSvg></div><Slider label="Curve coefficient" min={.25} max={2} step={.01} value={a} display={`y = ${a === 1 ? '' : a}x²`} onChange={setA} /></>
}
export function WorkedLab() {
  const [step, setStep] = useLoopValue(0, { min: 0, max: 2, period: 12 })
  const { automatic } = useLabDemo()
  return <><div className="lab-working" aria-live={automatic ? 'off' : 'polite'}><p>3x + 6 = 18</p><p className={step >= 1 ? 'is-written' : ''}>3x = 12</p><p className={step >= 2 ? 'is-written lab-solution' : ''}>x = 4</p></div><div className="lab-action-line"><span>{['Subtract 6 from both sides.', 'Divide both sides by 3.', 'Check: 3 × 4 + 6 = 18.'][step]}</span><button className="lab-button" onClick={() => setStep((step + 1) % 3)}>{step === 2 ? 'Reset' : 'Next step'}</button></div></>
}
