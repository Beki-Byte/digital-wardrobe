import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/** Weicher Kreis-Cursor (nur Maus, nicht Touch) */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      const t = (e.target as HTMLElement).closest('[data-cursor], a, button')
      el.classList.toggle('big', !!t)
    }
    window.addEventListener('pointermove', move)
    document.documentElement.classList.add('has-cursor')
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div className="cursor" ref={ref} aria-hidden="true" />
}
