import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { reducedMotion } from '../lib/quality'

const text =
  'Jedes Herz, jedes Nein, jeder getragene Look macht die Vorschläge ein Stück mehr zu deinen. Und alles bleibt auf deinem Handy – kein Konto, keine Cloud, kein Upload.'

/** Text färbt sich Wort für Wort beim Scrollen */
export function Promise() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.set('.pr-word', { opacity: 1 })
        return
      }
      gsap.to('.pr-word', {
        opacity: 1,
        stagger: 0.05,
        ease: 'none',
        scrollTrigger: { trigger: '.pr-text', start: 'top 80%', end: 'bottom 45%', scrub: true },
      })
    },
    { scope: root },
  )
  return (
    <section className="section promise" ref={root}>
      <p className="pr-text">
        {text.split(' ').map((w, i) => (
          <span key={i} className={`pr-word ${/Handy|deinen/.test(w) ? 'em' : ''}`}>
            {w}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}
