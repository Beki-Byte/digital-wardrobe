/** Geräte-Stufe – einmal bestimmen, überall nutzen */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches
const cores = navigator.hardwareConcurrency ?? 4
const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const webgl = hasWebGL()
/** high = alles · mid = Handy (weniger Details) · low = kein 3D */
export const tier: 'high' | 'mid' | 'low' =
  !webgl || reducedMotion || mem <= 2 ? 'low' : coarse || cores <= 4 ? 'mid' : 'high'
export const finePointer = !coarse
