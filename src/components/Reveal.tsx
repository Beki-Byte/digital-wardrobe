import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useRef, type ElementType, type ReactNode } from 'react'
import { reducedMotion } from '../lib/quality'

gsap.registerPlugin(ScrollTrigger, SplitText)

/** Headline, deren Zeilen beim Reinscrollen aus einer Maske fahren */
export function Reveal({ as: Tag = 'h2', className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    if (!ref.current) return
    if (reducedMotion) {
      gsap.from(ref.current, { autoAlpha: 0, duration: 0.8, scrollTrigger: { trigger: ref.current, start: 'top 85%' } })
      return
    }
    const split = SplitText.create(ref.current, { type: 'lines', mask: 'lines', linesClass: 'line' })
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: { trigger: ref.current, start: 'top 85%' },
    })
    return () => split.revert()
  })
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
