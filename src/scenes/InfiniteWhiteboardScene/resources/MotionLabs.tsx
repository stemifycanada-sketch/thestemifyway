import { useRef, useState } from 'react'
import { LabSvg, PlayButton, Slider, useLabClock, useLabDemo, useLoopValue } from './LabPrimitives'

export function PendulumLab() {
  const [length, setLength] = useLoopValue(1, { min: .5, max: 2, step: .01, period: 20 })
  const [manualPlaying, setPlaying] = useState(false)
  const { automatic, takeControl } = useLabDemo()
  const playing = automatic || manualPlaying
  const arm = useRef<SVGGElement>(null), phase = useRef(0), last = useRef(0)
  const period = 2 * Math.PI * Math.sqrt(length / 9.81)
  useLabClock(t => {
    phase.current += (t - last.current) * 2 * Math.PI / period
    last.current = t
    arm.current?.setAttribute('transform', `rotate(${15 * Math.cos(phase.current)} 150 16)`)
  }, playing)
  return <><div className="lab-visual"><LabSvg label={`Ideal pendulum, length ${length} metres, period ${period.toFixed(2)} seconds`}>{paint => <><path d="M103 18H197" stroke={paint('orange')} strokeWidth="13" strokeLinecap="round" /><g ref={arm} transform="rotate(15 150 16)"><path d={`M150 16V${46 + length * 32}`} stroke="#6c7387" strokeWidth="3" /><circle cx="150" cy={46 + length * 32} r="17" fill={paint('blue')} /><ellipse cx="145" cy={40 + length * 32} rx="5" ry="3" fill="#fff" opacity=".55" /></g><circle cx="150" cy="16" r="5" fill="#51466a" /><text x="34" y="110" fontSize="11" fill="#5c6070">T = {period.toFixed(2)} s</text></>}</LabSvg></div><div className="lab-control-pair"><Slider label="Pendulum length" min={.5} max={2} step={.01} value={length} display={`${length.toFixed(2)} m`} onChange={setLength} /><PlayButton playing={playing} onClick={() => { takeControl(); setPlaying(!playing) }} label="pendulum" /></div></>
}

export function WaveLab() {
  const [frequency, setFrequency] = useLoopValue(1, { min: .25, max: 2, step: .01, period: 18 })
  const [manualPlaying, setPlaying] = useState(false)
  const { automatic, takeControl } = useLabDemo()
  const playing = automatic || manualPlaying
  const path = useRef<SVGPathElement>(null), phase = useRef(0), last = useRef(0)
  const wave = (t: number) => Array.from({ length: 121 }, (_, i) => `${i ? 'L' : 'M'}${20 + i * 2.16} ${66 - 36 * Math.sin(i / 120 * Math.PI * 4 - t)}`).join(' ')
  useLabClock(t => {
    phase.current += (t - last.current) * frequency * Math.PI * 2
    last.current = t
    path.current?.setAttribute('d', wave(phase.current))
  }, playing)
  return <><div className="lab-visual"><LabSvg label={`Traveling wave at ${frequency} hertz`}>{paint => <><g className="lab-graph-grid">{[30, 66, 102].map(y => <path key={y} d={`M20 ${y}H280`} />)}{[20, 63, 106, 149, 192, 235, 280].map(x => <path key={x} d={`M${x} 12V120`} />)}</g><path d="M20 66H280" stroke="#8996ae" /><path ref={path} d={wave(0)} fill="none" stroke={paint('blue')} strokeWidth="9" strokeLinecap="round" /><text x="260" y="122" fontSize="10" fill="#6b7182">position</text></>}</LabSvg></div><div className="lab-control-pair"><Slider label="Wave frequency" min={.25} max={2} step={.01} value={frequency} display={`${frequency} Hz`} onChange={setFrequency} /><PlayButton playing={playing} onClick={() => { takeControl(); setPlaying(!playing) }} label="wave" /></div></>
}

export function CircuitLab() {
  const [switchValue, setSwitchValue] = useLoopValue(0, { min: 0, max: 1, period: 10 })
  const closed = switchValue === 1
  const { automatic } = useLabDemo()
  return <><div className={`lab-visual circuit ${closed ? 'is-closed' : ''}`}><LabSvg label={`Circuit ${closed ? 'closed, bulb on' : 'open, bulb off'}`}>{paint => <><path d="M84 45H130M166 45H238V110H62V75" fill="none" stroke="#e0c5a3" strokeWidth="9" strokeLinejoin="round" /><path className="circuit-flow" d="M84 45H130M166 45H238V110H62V75" fill="none" stroke="#f37b35" strokeWidth="4" strokeDasharray="5 12" /><path d={`M130 45L166 ${closed ? 45 : 24}`} stroke="#7453a0" strokeWidth="6" strokeLinecap="round" /><circle cx="130" cy="45" r="5" fill="#8653b8" /><circle cx="166" cy="45" r="5" fill="#8653b8" /><rect x="34" y="28" width="57" height="58" rx="12" fill={paint('blue')} /><text x="46" y="52" fill="#fff" fontSize="18">+</text><text x="69" y="74" fill="#fff" fontSize="18">−</text><circle className="bulb-halo" cx="238" cy="47" r="37" fill="#ffcb56" opacity={closed ? .22 : 0} /><circle cx="238" cy="47" r="24" fill={closed ? '#ffe5a1' : '#d8dde5'} stroke={closed ? '#ffb63b' : '#bbc5d4'} strokeWidth="2" /><path d="M230 67V49l8 6 8-6v18" stroke={closed ? '#ec7b24' : '#97a3b3'} strokeWidth="3" fill="none" /><rect x="226" y="69" width="24" height="13" rx="4" fill="#867c8f" /></>}</LabSvg></div><div className="lab-action-line"><span role="status" aria-live={automatic ? 'off' : 'polite'}>{closed ? 'Closed circuit · light on' : 'Open circuit · light off'}</span><button className="lab-button" role="switch" aria-checked={closed} aria-label="Circuit switch" onClick={() => setSwitchValue(closed ? 0 : 1)}>{closed ? 'Open' : 'Close'} circuit</button></div></>
}

const route = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0]]
const instructions = ['Ready', 'Right', 'Right', 'Down', 'Down', 'Left', 'Left', 'Up', 'Up']
export function RobotLab() {
  const [step, setStep] = useLoopValue(0, { min: 0, max: 8, period: 13.5, cycle: true })
  const { automatic } = useLabDemo()
  const [x, y] = route[step]
  return <><div className="lab-visual"><LabSvg label={`Robot at column ${x + 1}, row ${y + 1}, step ${step} of eight`}>{paint => <>{Array.from({ length: 9 }, (_, i) => <rect key={i} x={85 + i % 3 * 43} y={3 + Math.floor(i / 3) * 43} width="39" height="39" rx="7" fill={i % 2 ? '#fdfaff' : '#e4ddf3'} stroke="#d5cbea" />)}<g className="robot-body" style={{ transform: `translate(${104 + x * 43}px, ${22 + y * 43}px)` }}><rect x="-18" y="-14" width="36" height="30" rx="11" fill={paint('blue')} /><rect x="-12" y="-9" width="24" height="18" rx="7" fill="#222b50" /><circle cx="-5" cy="0" r="2.5" fill="#a7edff" /><circle cx="5" cy="0" r="2.5" fill="#a7edff" /><circle cx="-19" cy="1" r="4" fill={paint('orange')} /><circle cx="19" cy="1" r="4" fill={paint('orange')} /></g></>}</LabSvg></div><div className="lab-action-line"><span role="status" aria-live={automatic ? 'off' : 'polite'}>{step}/8 · {instructions[step]}</span><button className="lab-button" onClick={() => setStep((step + 1) % route.length)}>{step === 8 ? 'Reset' : 'Next move'}</button></div></>
}
