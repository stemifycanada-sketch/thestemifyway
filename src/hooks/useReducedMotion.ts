import { useContext } from 'react'
import { MotionContext } from '../components/motion/MotionProvider'

export function useReducedMotion() {
  const value = useContext(MotionContext)
  if (!value) throw new Error('useReducedMotion must be inside MotionProvider')
  return value
}
