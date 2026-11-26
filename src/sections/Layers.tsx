import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { Pants, Shirt, ShortDress } from '../components/Garments'
import { Reveal } from '../components/Reveal'
import { reducedMotion } from '../lib/quality'

/** Drei Teile kommen von außen und werden zu einem Look geschichtet */
export function Layers() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion) return
      gsap
        .timeline({ scrollTrigger: { trigger: '.ly-stage', start: 'top 85%', end: 'center 45%', scrub: 0.8 } })
        .from('.ly-shirt', { xPercent: -90, rotate: -10, ease: 'none' }, 0)
        .from('.ly-dress', { yPercent: -40, autoAlpha: 0, ease: 'none' }, 0.1)
        .from('.ly-pants', { xPercent: 90, rotate: 10, ease: 'none' }, 0)
        .from('.ly-tag', { autoAlpha: 0, stagger: 0.1, ease: 'none' }, 0.5)
    },
    { scope: root },
  )
  return (
    <section className="section layers" ref={root}>
      <div className="copy">
        <Reveal>Schicht für Schicht.</Reveal>
        <p>
          Hemd drunter, kurzes Kleid drüber, Hose dazu. Die App kombiniert in Lagen – und du entscheidest, ob kurze Kleider
          für dich auch allein gehen, nur bei Wärme oder immer mit etwas drunter.
        </p>
      </div>
      <div className="ly-stage" aria-hidden="true">
        <Pants className="ly ly-pants" color="#2f3b4c" />
        <Shirt className="ly ly-shirt" />
        <ShortDress className="ly ly-dress" />
        <span className="ly-tag t1">Hemd · drunter</span>
        <span className="ly-tag t2">Kleid · kurz</span>
        <span className="ly-tag t3">Hose · drunter</span>
      </div>
    </section>
  )
}
