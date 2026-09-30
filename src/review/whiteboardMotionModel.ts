/** A non-colliding, no-slip rolling study. Units: metres, seconds, radians.
 * A finite smooth push is followed by smooth opposing rolling resistance.
 * This is a prescribed acceleration model, not a general collision solver.
 */
export const DURATION = 5
export const BAKE_FPS = 60
export const FOV = 42
export const BOARD_COLOR = '#f3f0ed'
export const END_HEIGHT = 9
export const DOT_SPACING = 2 * END_HEIGHT * Math.tan(FOV * Math.PI / 360) * 24 / 1080
export const DOT_RADIUS = DOT_SPACING / 30
export const balls = [
  { id: 'blue', color: '#2456da', radius: .43, start: [-1.4, 1.3], direction: [1, -.45], distance: 1.85, delay: .15, duration: 2.85, push: .45 },
  { id: 'orange', color: '#fa641b', radius: .35, start: [2.15, .7], direction: [-.35, -1], distance: 1.55, delay: .55, duration: 2.65, push: .5 },
] as const
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (v: number) => { const u = clamp(v); return u * u * u * (u * (u * 6 - 15) + 10) }

export function rollingState(ball: typeof balls[number], time: number) {
  const t = Math.max(0, Math.min(ball.duration, time - ball.delay))
  const coast = ball.duration - ball.push
  // The push's sinusoidal acceleration has mean velocity vmax/2.
  // The cosine braking phase also has mean velocity vmax/2, giving the exact distance.
  const vmax = 2 * ball.distance / ball.duration
  let distance: number, speed: number
  if (t < ball.push) {
    speed = vmax / 2 * (1 - Math.cos(Math.PI * t / ball.push))
    distance = vmax / 2 * (t - ball.push / Math.PI * Math.sin(Math.PI * t / ball.push))
  } else {
    const elapsed = t - ball.push
    speed = vmax / 2 * (1 + Math.cos(Math.PI * elapsed / coast))
    distance = vmax * ball.push / 2 + vmax / 2 * (elapsed + coast / Math.PI * Math.sin(Math.PI * elapsed / coast))
  }
  if (time >= ball.delay + ball.duration) { distance = ball.distance; speed = 0 }
  const length = Math.hypot(...ball.direction), dx = ball.direction[0] / length, dz = ball.direction[1] / length
  return {
    position: [ball.start[0] + dx * distance, ball.radius, ball.start[1] + dz * distance] as [number, number, number],
    axis: [dz, 0, -dx] as [number, number, number],
    angle: distance / ball.radius, distance, speed, angularSpeed: speed / ball.radius,
  }
}

export function cameraState(time: number) {
  // Monotone Hermite keys preserve a continuous tilt velocity through each
  // storyboard beat, with a stationary start and a stationary overhead finish.
  const keys = [[0, 16, 0], [1.6, 45, 18], [3.3, 70, 19], [3.7, 80, 21], [4.1, 86, 18], [4.4, 90, 0]]
  const t = Math.max(0, Math.min(4.4, time))
  const index = Math.min(keys.length - 2, Math.max(0, keys.findIndex((key, i) => i < keys.length - 1 && t <= keys[i + 1][0] && t >= key[0])))
  const [ta, pa, va] = keys[index], [tb, pb, vb] = keys[index + 1]
  const u = clamp((t - ta) / (tb - ta)), u2 = u * u, u3 = u2 * u
  const degrees = (2 * u3 - 3 * u2 + 1) * pa + (u3 - 2 * u2 + u) * (tb - ta) * va + (-2 * u3 + 3 * u2) * pb + (u3 - u2) * (tb - ta) * vb
  const p = (degrees - 16) / 74
  const pitch = degrees * Math.PI / 180
  const height = 2.4 + (END_HEIGHT - 2.4) * p
  return { position: [0, height, height / Math.tan(pitch)] as [number, number, number], pitch: pitch * 180 / Math.PI }
}
export function sampleMotion(time: number) {
  const t = Math.max(0, Math.min(DURATION, time))
  return { time: t, camera: cameraState(t), balls: balls.map(ball => rollingState(ball, t)), opacity: 1 - smooth((t - 4.4) / .5) }
}
// 301 poses: 300 intervals plus the exact 5.0s endpoint for reversible scrubbing.
export const bakedMotion = Array.from({ length: DURATION * BAKE_FPS + 1 }, (_, frame) => sampleMotion(frame / BAKE_FPS))
export function readBakedMotion(time: number) {
  const frame = Math.max(0, Math.min(DURATION, time)) * BAKE_FPS
  const a = bakedMotion[Math.floor(frame)], b = bakedMotion[Math.min(bakedMotion.length - 1, Math.ceil(frame))]
  const u = frame - Math.floor(frame), lerp = (x: number, y: number) => x + (y - x) * u
  const vector = (x: [number, number, number], y: [number, number, number]) => x.map((value, i) => lerp(value, y[i])) as [number, number, number]
  return {
    time: lerp(a.time, b.time), opacity: lerp(a.opacity, b.opacity),
    camera: { position: vector(a.camera.position, b.camera.position), pitch: lerp(a.camera.pitch, b.camera.pitch) },
    balls: a.balls.map((ball, i) => ({ ...ball, position: vector(ball.position, b.balls[i].position), distance: lerp(ball.distance, b.balls[i].distance), angle: lerp(ball.angle, b.balls[i].angle), speed: lerp(ball.speed, b.balls[i].speed), angularSpeed: lerp(ball.angularSpeed, b.balls[i].angularSpeed) })),
  }
}
