import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { reducedMotion } from '../lib/quality'

/** Zähler 0–100, dann öffnet sich der Vorhang zum Hero */
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.3, onComplete: onDone })
        return
      }
      const c = { v: 0 }
      gsap
        .timeline({ onComplete: onDone })
        .to(c, {
          v: 100,
          duration: 1.6,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (num.current) num.current.textContent = String(Math.round(c.v))
          },
        })
        .to('.pre-word span', { yPercent: -110, duration: 0.7, ease: 'power3.in', stagger: 0.03 }, '-=0.2')
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut' }, '-=0.2')
    },
    { scope: root },
  )

  return (
    <div className="preloader" ref={root} aria-hidden="true">
      <div className="pre-word">
        {'Kleiderschrank'.split('').map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
      <span className="pre-num" ref={num}>0</span>
    </div>
  )
}
