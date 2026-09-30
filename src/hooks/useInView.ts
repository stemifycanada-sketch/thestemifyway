import { useEffect, useState, type RefObject } from 'react'

export function useInView(ref: RefObject<HTMLElement | null>, rootMargin = '0px') {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, rootMargin])
  return visible
}
