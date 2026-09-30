// Normalized deterministic poses: no accumulated deltas, so reverse scroll is exact.
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const beat = (value: number, from: number, to: number) => {
  const t = clamp01((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

export function sampleHero(progress: number) {
  return {
    dolly: beat(progress, 0.2, 0.45),
    attention: beat(progress, 0.45, 0.65),
    activation: beat(progress, 0.65, 0.85),
    exit: beat(progress, 0.85, 1),
    // Fade only near the end, after upward and depth travel are already visible.
    departureOpacity: 1 - beat(progress, 0.955, 1),
    headlineOpacity: 1 - beat(progress, 0.30, 0.65),
  }
}

// Deliberately asymmetric depth staging: a close book, middle learning tools,
// distant mechanics/bridge. Values are world coordinates, not a UI orbit/grid.
export const heroWorlds = [
  { id: 'math', label: 'Mathematics', position: [2.35, 1.15, .3], scale: .86, mobile: [1.48, 1.35, .2], mobileScale: .61 },
  { id: 'chemistry', label: 'Chemistry', position: [2.4, 3.65, -2.5], scale: .86, mobile: [-1.25, 2.2, -1.2], mobileScale: .6 },
  { id: 'physics', label: 'Physics', position: [-2, 2.45, -3.1], scale: .76, mobile: [.35, 3.1, -3], mobileScale: .56 },
  { id: 'biology', label: 'Biology', position: [3.0, -1.25, -1.2], scale: .82, mobile: [1.8, -.7, -1], mobileScale: .57 },
  { id: 'engineering', label: 'Structural engineering', position: [-.3, 3.25, -4], scale: .65, mobile: [-1.25, -.9, -2.8], mobileScale: .49 },
  { id: 'arts', label: 'Arts', position: [-2.05, .0, -.3], scale: .78, mobile: [-1.8, .5, -.6], mobileScale: .52 },
  { id: 'language', label: 'Language', position: [-2.3, -2.0, 3.1], scale: 1.12, mobile: [-1.45, -2.45, 1.1], mobileScale: .73 },
] as const
export type HeroWorldId = (typeof heroWorlds)[number]['id']

// Explicit next-scene contract. M3 consumes this; it does not introduce a new anchor.
export const heroHandoff = { subject: 'math', character: 'student-hero-rear-right', nextCameraSide: 'right-shoulder' } as const
