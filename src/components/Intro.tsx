import { useEffect, useRef, useState } from 'react'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/bodoni-moda/latin-400.css'
import '@fontsource/syne/latin-700.css'
import '@fontsource/pinyon-script/latin-400.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/unbounded/latin-700.css'
import '@fontsource/dm-serif-display/latin-400.css'

/* Intro: „Kleiderschrank“ probiert Outfits an – das Wort wechselt
 * ständig die Schrift, wird langsamer, bleibt stehen und blendet
 * weich aus, während darunter die App auftaucht. */

type Look = { family: string; weight?: number; style?: string; spacing?: string; transform?: string; size?: number }

const LOOKS: Look[] = [
  { family: "'Bodoni Moda'", weight: 400, spacing: '-0.02em' },
  { family: "'Caveat'", weight: 700, size: 1.15 },
  { family: "'Unbounded'", weight: 700, spacing: '-0.04em', size: 0.72 },
  { family: "'Pinyon Script'", weight: 400, size: 1.05 },
  { family: "'Space Mono'", weight: 400, spacing: '-0.06em', size: 0.78 },
  { family: "'Syne'", weight: 700, spacing: '-0.03em', size: 0.86 },
  { family: "'DM Serif Display'", weight: 400 },
  { family: "'Manrope Variable'", weight: 800, spacing: '-0.05em', size: 0.82 },
  { family: "'Fraunces Variable'", weight: 300, style: 'italic' },
]
const FINAL: Look = { family: "'Fraunces Variable'", weight: 300, style: 'italic', spacing: '-0.03em' }

export function Intro({ ready, onReveal, onDone }: { ready: boolean; onReveal: () => void; onDone: () => void }) {
  const [look, setLook] = useState<Look>(LOOKS[0])
  const [phase, setPhase] = useState<'cycle' | 'hold' | 'fade'>('cycle')
  const reduce = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches)

  // Schriften laden (max. 1 s warten), dann wechseln
  useEffect(() => {
    let stop = false
    const timers: number[] = []
    const wait = Promise.race([
      Promise.all(LOOKS.map((l) => document.fonts.load(`${l.style ?? 'normal'} ${l.weight ?? 400} 40px ${l.family}`).catch(() => null))),
      new Promise((r) => setTimeout(r, 1000)),
    ])
    wait.then(() => {
      if (stop) return
      if (reduce.current) {
        setLook(FINAL)
        setPhase('hold')
        return
      }
      // Rhythmus: schnell, dann immer langsamer
      const delays = [90, 90, 90, 95, 100, 105, 110, 120, 130, 145, 165, 190, 220, 260, 310]
      let t = 0
      delays.forEach((d, i) => {
        t += d
        timers.push(window.setTimeout(() => setLook(LOOKS[(i + 1) % LOOKS.length]), t))
      })
      timers.push(window.setTimeout(() => {
        setLook(FINAL)
        setPhase('hold')
      }, t + 360))
    })
    return () => {
      stop = true
      timers.forEach(clearTimeout)
    }
  }, [])

  // Nach dem Stehenbleiben (und wenn die App bereit ist): ausblenden
  useEffect(() => {
    if (phase !== 'hold' || !ready) return
    const t = window.setTimeout(() => {
      setPhase('fade')
      onReveal()
    }, reduce.current ? 200 : 650)
    return () => clearTimeout(t)
  }, [phase, ready, onReveal])

  return (
    <div
      className={`intro ${phase}`}
      onTransitionEnd={(e) => e.target === e.currentTarget && phase === 'fade' && onDone()}
      aria-hidden="true"
    >
      <span
        className="intro-word"
        style={{
          fontFamily: look.family,
          fontWeight: look.weight,
          fontStyle: look.style ?? 'normal',
          letterSpacing: look.spacing ?? '0',
          fontSize: `calc(clamp(2.6rem, 13vw, 7rem) * ${look.size ?? 1})`,
        }}
      >
        Kleiderschrank
      </span>
    </div>
  )
}
