import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion } from './quality'

gsap.registerPlugin(ScrollTrigger)

export function initSmoothScroll() {
  if (reducedMotion) return null
  const lenis = new Lenis({ lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (t: number) => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis.destroy()
  }
}

/** Gemeinsamer Zustand zwischen DOM-Scroll und 3D-Szene */
export const scene = {
  progress: 0, // 0 = Schrank zu, 1 = Kamera ganz drin
  mouseX: 0,
  mouseY: 0,
  active: true,
}
