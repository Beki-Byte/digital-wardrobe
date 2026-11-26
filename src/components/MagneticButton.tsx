import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { finePointer, reducedMotion } from '../lib/quality'

/** Button, der sich leicht zur Maus hinzieht */
export function MagneticButton({ href, onClick, children, className = '' }: { href?: string; onClick?: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  const on = finePointer && !reducedMotion
  const move = (e: React.PointerEvent) => {
    if (!on || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2
    const y = e.clientY - r.top - r.height / 2
    gsap.to(ref.current, { x: x * 0.3, y: y * 0.4, duration: 0.6, ease: 'power3.out' })
  }
  const leave = () => on && gsap.to(ref.current, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })
  const props = { ref, className: `magnetic ${className}`, onPointerMove: move, onPointerLeave: leave, 'data-cursor': 'big' }
  return href ? (
    <a {...props} href={href} onClick={onClick}>
      <span>{children}</span>
    </a>
  ) : (
    <button {...props} onClick={onClick}>
      <span>{children}</span>
    </button>
  )
}
