/** Geräte-Stufe – einmal bestimmen, überall nutzen */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches
const cores = navigator.hardwareConcurrency ?? 4

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const webgl = hasWebGL()
export const tier: 'high' | 'mid' | 'low' = reducedMotion || !webgl ? 'low' : coarse || cores <= 4 ? 'mid' : 'high'
export const finePointer = !coarse
