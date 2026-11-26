import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { Coat, Pants, Shirt, Sweater } from '../components/Garments'
import { reducedMotion } from '../lib/quality'

/** Gepinnte Szene: Der Tag läuft von 7 bis 16 Uhr, −4° werden 12°, der Mantel geht aus */
export function Weather() {
  const root = useRef<HTMLElement>(null)
  const temp = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const set = (p: number) => {
        const t = Math.round(-4 + p * 16)
        const h = 7 + p * 9
        if (temp.current) temp.current.textContent = `${t < 0 ? '-' : ''}${Math.abs(t)}°`
        if (time.current) time.current.textContent = `${Math.floor(h)}:${String(Math.round((h % 1) * 60 / 15) * 15 % 60).padStart(2, '0')}`
        root.current?.style.setProperty('--p', String(p))
      }
      if (reducedMotion) return set(0)
      set(0)
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: '+=180%', pin: true, scrub: 0.6,
            onUpdate: (s) => set(s.progress),
          },
        })
        .to('.wx-coat', { xPercent: 70, rotate: 14, autoAlpha: 0, ease: 'power2.in', duration: 0.3 }, 0.5)
        .to('.wx-note-a', { autoAlpha: 0, y: -10, duration: 0.1 }, 0.5)
        .fromTo('.wx-note-b', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.62)
        .to({}, { duration: 0.2 }, 0.8)
    },
    { scope: root },
  )

  return (
    <section className="section weather" ref={root}>
      <div className="wx-sky" />
      <div className="wx-grid">
        <div className="wx-read">
          <span className="wx-time" ref={time}>7:00</span>
          <span className="wx-temp" ref={temp}>-4°</span>
          <p className="wx-note wx-note-a">Auf dem Schulweg: Mantel an.</p>
          <p className="wx-note wx-note-b">Am Nachmittag: Mantel aus – darunter passt es immer noch.</p>
        </div>
        <div className="wx-look" aria-hidden="true">
          <Pants className="wx-piece wx-pants" />
          <Shirt className="wx-piece wx-shirt" />
          <Sweater className="wx-piece wx-sweater" />
          <Coat className="wx-piece wx-coat" />
        </div>
      </div>
      <p className="wx-copy">
        Morgens minus vier, nachmittags zwölf Grad. Die App rechnet mit dem ganzen Tag: Was du drunter trägst, passt zur
        wärmsten Stunde – die Jacke zur kältesten.
      </p>
    </section>
  )
}
