import type { BottomType, Category, LayerRole, Length, Sleeves, Slot } from './types'

export const categoryLabels: Record<Category, string> = {
  oberteil: 'Oberteil',
  unterteil: 'Unterteil',
  kleid: 'Kleid',
  jacke: 'Jacke',
  schuhe: 'Schuhe',
  hijab: 'Hijab',
  ring: 'Ring',
  armband: 'Armband',
  kette: 'Kette',
  guertel: 'Gürtel',
}

export const categoryIcons: Record<Category, string> = {
  oberteil: '👚',
  unterteil: '👖',
  kleid: '👗',
  jacke: '🧥',
  schuhe: '👟',
  hijab: '🧕',
  ring: '💍',
  armband: '📿',
  kette: '🔗',
  guertel: '🪢',
}

export const slotLabels: Record<Slot, string> = {
  unterschicht: 'Drunter',
  oberteil: 'Oberteil',
  kleid: 'Kleid',
  unterteil: 'Unterteil',
  unterteilDrunter: 'Unterteil drunter',
  jacke: 'Jacke',
  schuhe: 'Schuhe',
  hijab: 'Hijab',
  ring: 'Ring',
  armband: 'Armband',
  kette: 'Kette',
  guertel: 'Gürtel',
}

export const slotCategory: Record<Slot, Category> = {
  unterschicht: 'oberteil',
  oberteil: 'oberteil',
  kleid: 'kleid',
  unterteil: 'unterteil',
  unterteilDrunter: 'unterteil',
  jacke: 'jacke',
  schuhe: 'schuhe',
  hijab: 'hijab',
  ring: 'ring',
  armband: 'armband',
  kette: 'kette',
  guertel: 'guertel',
}

export const lengthLabels: Record<Length, string> = { kurz: 'Kurz', mittel: 'Mittel', lang: 'Lang' }
export const sleeveLabels: Record<Sleeves, string> = { ohne: 'Ärmellos', kurz: 'Kurzarm', lang: 'Langarm' }
export const layerLabels: Record<LayerRole, string> = {
  drunter: 'Nur drunter',
  drueber: 'Nur drüber',
  beides: 'Beides',
}
export const bottomLabels: Record<BottomType, string> = {
  hose: 'Hose',
  rock: 'Rock',
  shorts: 'Shorts',
  leggings: 'Leggings / Strumpfhose',
}

export const warmthLabels = ['', 'Sehr leicht', 'Leicht', 'Mittel', 'Warm', 'Sehr warm']

export const styleTags = ['casual', 'schick', 'sportlich', 'elegant', 'gemütlich', 'Schule', 'Party']

export const weatherText = (code: number): { text: string; icon: string } => {
  if (code === 0) return { text: 'Klar', icon: '☀️' }
  if (code <= 2) return { text: 'Leicht bewölkt', icon: '🌤️' }
  if (code === 3) return { text: 'Bewölkt', icon: '☁️' }
  if (code <= 48) return { text: 'Nebel', icon: '🌫️' }
  if (code <= 57) return { text: 'Nieselregen', icon: '🌦️' }
  if (code <= 67) return { text: 'Regen', icon: '🌧️' }
  if (code <= 77) return { text: 'Schnee', icon: '🌨️' }
  if (code <= 82) return { text: 'Regenschauer', icon: '🌦️' }
  if (code <= 86) return { text: 'Schneeschauer', icon: '🌨️' }
  return { text: 'Gewitter', icon: '⛈️' }
}
