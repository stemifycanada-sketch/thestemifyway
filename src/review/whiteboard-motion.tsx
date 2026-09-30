import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { Color, Quaternion, Vector3 } from 'three'
import { bakedMotion, balls, BOARD_COLOR, DOT_RADIUS, DOT_SPACING, DURATION, FOV, readBakedMotion, cameraState } from './whiteboardMotionModel'
import '../styles/fonts.css'
import './whiteboard-motion.css'

const captureMode = new URLSearchParams(location.search).has('capture')
if (captureMode) document.documentElement.dataset.capture = 'true'

const vertexShader = `varying vec3 worldPoint;
void main() { vec4 world = modelMatrix * vec4(position, 1.0); worldPoint = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`
const fragmentShader = `uniform vec3 groundColor; uniform vec3 dotColor; uniform float spacing; uniform float radius; varying vec3 worldPoint;
void main() {
  vec2 cell = (fract(worldPoint.xz / spacing + vec2(0.0, 0.5)) - .5) * spacing;
  float footprint = max(length(dFdx(worldPoint.xz)), length(dFdy(worldPoint.xz)));
  float aa = max(footprint * .65, .0001);
  float dotMask = 1.0 - smoothstep(radius-aa, radius+aa, length(cell));
  float visibility = 1.0 - smoothstep(spacing * .16, spacing * .45, footprint);
  gl_FragColor = vec4(mix(groundColor, dotColor, dotMask * visibility), 1.0);
  #include <colorspace_fragment>
}`
function World({ time, overhead }: { time: number; overhead: boolean }) {
  const { camera, invalidate } = useThree()
  const pose = readBakedMotion(time)
  const view = overhead ? cameraState(4.4) : pose.camera
  const uniforms = useMemo(() => ({ groundColor: { value: new Color(BOARD_COLOR) }, dotColor: { value: new Color('#bfc2b9') }, spacing: { value: DOT_SPACING }, radius: { value: DOT_RADIUS } }), [])
  useEffect(() => {
    camera.position.set(...view.position)
    // A fixed -Z up vector avoids the lookAt singularity at true overhead.
    camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); invalidate()
  }, [camera, invalidate, view.position])
  return <>
    <color attach="background" args={[BOARD_COLOR]} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[-3, 7, 4]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.0001} shadow-normalBias={.02} shadow-radius={3} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 200]} /><shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} toneMapped={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .001, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={.19 * pose.opacity} depthWrite={false} />
    </mesh>
    {balls.map((ball, index) => {
      const state = pose.balls[index]
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(...state.axis), state.angle)
      return <group key={ball.id} position={state.position} quaternion={rotation} visible={pose.opacity > .001}>
        <mesh castShadow><sphereGeometry args={[ball.radius, 64, 40]} /><meshStandardMaterial color={ball.color} metalness={.12} roughness={.27} transparent opacity={pose.opacity} /></mesh>
        <mesh><sphereGeometry args={[ball.radius * 1.001, 64, 8, 0, Math.PI * 2, Math.PI / 2 - .025, .05]} /><meshStandardMaterial color="#fff9ee" roughness={.4} transparent opacity={pose.opacity} /></mesh>
        <mesh><sphereGeometry args={[ball.radius * 1.002, 16, 8, Math.PI / 2 - .12, .24, Math.PI / 2 - .12, .24]} /><meshStandardMaterial color="#18222b" transparent opacity={pose.opacity} /></mesh>
      </group>
    })}
  </>
}
const beats = [{ t: 0, label: 'Eye level' }, { t: 1.6, label: 'Rise' }, { t: 3.3, label: 'Bird’s-eye' }, { t: 4.4, label: 'Aligned' }, { t: 5, label: 'Clear board' }]
function App() {
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [overhead, setOverhead] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [scrollEnabled, setScrollEnabled] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const stage = useRef<HTMLDivElement>(null)
  const pose = readBakedMotion(time)
  useEffect(() => {
    if (!captureMode) return
    const seekFrame = (event: Event) => {
      const frame = Number((event as CustomEvent<number>).detail)
      if (Number.isFinite(frame)) { setPlaying(false); setTime(Math.max(0, Math.min(5, frame / 60))) }
    }
    window.addEventListener('stemify-capture-frame', seekFrame)
    return () => window.removeEventListener('stemify-capture-frame', seekFrame)
  }, [])
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(query.matches); if (query.matches) { setPlaying(false); setScrollEnabled(false) } }
    query.addEventListener('change', change)
    const hidden = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', hidden)
    return () => { query.removeEventListener('change', change); document.removeEventListener('visibilitychange', hidden) }
  }, [])
  useEffect(() => {
    if (!playing) return
    let frame = 0, previous = performance.now(), current = time
    const tick = (now: number) => {
      current = Math.min(DURATION, current + Math.min((now - previous) / 1000, .1)); previous = now
      setTime(current)
      if (current >= DURATION) setPlaying(false)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Playback owns its clock until pause; scrubbing always pauses it first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])
  useEffect(() => {
    const element = stage.current
    if (!element || !scrollEnabled) return
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      const movement = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)
      const atStart = Number(element.dataset.time) <= 0 && movement < 0
      const atEnd = Number(element.dataset.time) >= DURATION && movement > 0
      if (atStart || atEnd) return
      event.preventDefault(); setPlaying(false)
      setTime(t => Math.max(0, Math.min(DURATION, t + movement * .003)))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [scrollEnabled])
  const seek = (t: number) => { setPlaying(false); setTime(t) }
  const saveBake = () => {
    const data = { duration: DURATION, fps: 60, units: 'metres, seconds, radians', groundColor: BOARD_COLOR, dotSpacing: DOT_SPACING, balls, poses: bakedMotion }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'stemify-whiteboard-motion-60fps.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <main>
    <header className="study-header"><a className="study-brand" href="/">STEM<span>IFY</span></a><span>Motion study <i>/</i> 01</span><a className="back-link" href="/">Back to website ↗</a></header>
    <div className="study-intro"><div><p className="study-kicker">THE INFINITE WHITEBOARD</p><h1>A world coming to life.</h1></div><p>Two rolling balls. One continuous camera move.<br />Explore the five-second motion before we build the full scene.</p></div>
    <div className="study-stage" ref={stage} data-time={time.toFixed(4)} data-pitch={(overhead ? 90 : pose.camera.pitch).toFixed(3)} data-pose={JSON.stringify(pose)} data-playing={playing}>
      <Canvas frameloop="demand" dpr={[1, 2]} shadows camera={{ position: [0, 2.4, 8.37], fov: FOV, near: .1, far: 250 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }} fallback={<p>WebGL is needed for the 3D preview. The storyboard is linked below.</p>} onCreated={({ gl }) => { gl.domElement.setAttribute('aria-label', 'Three-dimensional whiteboard camera and rolling-ball preview'); gl.domElement.setAttribute('role', 'img'); stage.current?.setAttribute('data-ready', 'true') }}><World time={time} overhead={overhead} /></Canvas>
      <div className="stage-label"><span>{overhead ? 'FIXED OVERHEAD INSPECTION' : time < 3.3 ? 'RISE + ROLL' : time < 4.4 ? 'TILT INTO ALIGNMENT' : time < 4.9 ? 'HOLD + SOFT FADE' : 'MATCHED CANVAS'}</span><span>{time.toFixed(2)}s / 5.00s</span></div>
    </div>
    <section className="study-controls" aria-label="Preview controls">
      <div className="transport"><button className="play-button" onClick={() => { if (playing) setPlaying(false); else { if (time >= DURATION) setTime(0); setPlaying(true) } }}>{playing ? 'Pause' : time >= DURATION ? 'Replay' : 'Play preview'}<span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button><button className="reset-button" onClick={() => seek(0)}>Reset</button><label className="timeline-label">Timeline <input type="range" min="0" max="5" step="0.001" value={time} onChange={e => seek(Number(e.target.value))} aria-label="Timeline" aria-valuetext={`${time.toFixed(2)} seconds of 5`} /></label><output className="time-output">{time.toFixed(2)}<small> / 5.00s</small></output></div>
      <div className="beat-controls">{beats.map(beat => <button key={beat.t} onClick={() => seek(beat.t)} aria-pressed={Math.abs(time - beat.t) < .015}><span>{beat.t.toFixed(1)}s</span>{beat.label}</button>)}</div>
      <div className="study-options"><label><input type="checkbox" checked={scrollEnabled} onChange={e => setScrollEnabled(e.target.checked)} /> Scroll over the scene to scrub</label><label><input type="checkbox" checked={overhead} onChange={e => setOverhead(e.target.checked)} /> Inspect from above</label><span className="color-chip"><i />#f3f0ed</span></div>
      {reduced && <p className="reduced-note">Reduced motion: playback starts only when you choose Play. Use the named frames for still views.</p>}
    </section>
    <footer className="study-footer"><p><strong>Watch the white bands.</strong> Rotation follows travel distance; both balls stay on the board. Scroll backward to retrace the same motion.</p><details><summary>About this preview</summary><p>A simple 3D blocking study with smooth initial pushes and rolling resistance. The paths do not collide. This is not the finished world or a rendered video. The camera settles overhead at 4.4s; balls and shadows fade by 4.9s. The dot spacing is designed for a 1920×1080 endpoint.</p><button onClick={saveBake}>Download the 60fps motion data ↓</button><a href="/thestemifyway/assets/cinema/laptop-portal-end.webp">View the approved world reference ↗</a></details></footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
