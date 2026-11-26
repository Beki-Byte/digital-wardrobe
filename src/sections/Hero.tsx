import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { scene } from '../lib/smooth-scroll'
import { reducedMotion, tier } from '../lib/quality'
import { StaticWardrobe } from '../components/StaticWardrobe'

const WardrobeCanvas = lazy(() => import('../webgl/WardrobeScene'))

export function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(true)

  // Maus / Neigung → Szene
  useEffect(() => {
    const move = (e: PointerEvent) => {
      scene.mouseX = (e.clientX / innerWidth) * 2 - 1
      scene.mouseY = -((e.clientY / innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useGSAP(
    () => {
      if (tier === 'low') return
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (s) => (scene.progress = s.progress),
        onToggle: (s) => setActive(s.isActive || s.progress < 1),
      })
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })
      tl.to('.hero-q', { yPercent: -40, autoAlpha: 0, ease: 'none', duration: 0.3 }, 0.08)
        .to('.hero-hint', { autoAlpha: 0, duration: 0.1 }, 0.02)
        .fromTo('.hero-a', { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'none', duration: 0.25 }, 0.5)
        .to('.hero-a', { autoAlpha: 0, duration: 0.15 }, 0.88)
    },
    { scope: root },
  )

  // Kleiner Türspalt nach dem Laden – lädt zum Scrollen ein
  useEffect(() => {
    if (!ready || tier === 'low' || scrollY > 10) return
    const o = { v: 0 }
    gsap.to(o, {
      v: 0.07, duration: 1.4, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: 0.3,
      onUpdate: () => { if (scrollY < 10) scene.progress = o.v },
    })
  }, [ready])

  return (
    <section className={`hero ${tier === 'low' ? 'hero-static' : ''}`} ref={root}>
      <div className="hero-stage">
        <div className="hero-glow" />
        {tier === 'low' ? (
          <StaticWardrobe />
        ) : (
          <Suspense fallback={<StaticWardrobe />}>
            <WardrobeCanvas active={active} />
          </Suspense>
        )}
        <h1 className="hero-q">
          <span>Was ziehe ich</span>
          <span>heute an?</span>
        </h1>
        {tier !== 'low' && <p className="hero-a">Dein Schrank weiß es.</p>}
        {tier === 'low' && <p className="hero-a static">Dein Schrank weiß es.</p>}
        {!reducedMotion && tier !== 'low' && (
          <p className="hero-hint">
            <span className="hint-line" /> Scroll, und der Schrank geht auf
          </p>
        )}
      </div>
    </section>
  )
}
