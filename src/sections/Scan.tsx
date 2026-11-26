import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { Blouse } from '../components/Garments'
import { Reveal } from '../components/Reveal'
import { reducedMotion } from '../lib/quality'

/** Szene: Ein Foto auf dem Bett – die Scan-Linie entfernt den Hintergrund */
export function Scan() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.set('.scan-bg', { clipPath: 'inset(0 0 100% 0)' })
        return
      }
      gsap
        .timeline({ scrollTrigger: { trigger: '.scan-photo', start: 'top 70%', end: 'bottom 35%', scrub: 0.8 } })
        .fromTo('.scan-bg', { clipPath: 'inset(0% 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)', ease: 'none' }, 0)
        .fromTo('.scan-line', { top: '0%' }, { top: '100%', ease: 'none' }, 0)
        .fromTo('.scan-photo .blouse', { scale: 0.94 }, { scale: 1, ease: 'none' }, 0)
        .to('.scan-chip', { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.2 }, 0.75)
    },
    { scope: root },
  )
  return (
    <section className="section scan" ref={root}>
      <div className="copy">
        <Reveal>Ein Foto. Mehr braucht es nicht.</Reveal>
        <p>
          Leg dein Teil aufs Bett, mach ein Foto – der Hintergrund verschwindet von selbst. Es bleibt deine Bluse, mit ihrem
          Muster, ihrer Farbe, genau so wie sie ist.
        </p>
      </div>
      <figure className="scan-photo">
        <div className="scan-bg" />
        <Blouse className="blouse" />
        <div className="scan-line" />
        <figcaption>
          <span className="scan-chip">Oberteil</span>
          <span className="scan-chip"><i style={{ background: '#f4ead8' }} />Creme mit Punkten</span>
          <span className="scan-chip">Langarm</span>
        </figcaption>
      </figure>
    </section>
  )
}
