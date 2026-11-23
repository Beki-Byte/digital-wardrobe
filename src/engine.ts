import { hue, neutrals } from './image'
import type {
  DayWeather,
  Item,
  Outfit,
  OutfitParts,
  Preferences,
  Settings,
  Slot,
  Template,
} from './types'

/* =====================================================================
 * Wärme-Modell
 * Jedes Teil hat Wärme 1–5. Daraus wird eine Outfit-Wärme berechnet und
 * mit dem verglichen, was bei einer Temperatur nötig ist.
 * Das Outfit OHNE Jacke soll zur wärmsten Zeit des Tages passen,
 * das Outfit MIT Jacke zur kältesten (z. B. morgens auf dem Schulweg).
 * ===================================================================== */

export const need = (t: number) => Math.min(11, Math.max(1.5, 2 + (24 - t) / 3.5))

const MAIN_SLOTS: Slot[] = ['unterschicht', 'oberteil', 'kleid', 'unterteil', 'unterteilDrunter', 'jacke', 'schuhe', 'hijab']
const JEWELRY_SLOTS: Slot[] = ['ring', 'armband', 'kette', 'guertel']

type ById = Map<string, Item>

export function bodyWarmth(p: OutfitParts, by: ById): number {
  const g = (s: Slot) => (p[s] ? by.get(p[s]!) : undefined)
  const under = g('unterschicht'), top = g('oberteil'), dress = g('kleid')
  const bottom = g('unterteil'), bottomUnder = g('unterteilDrunter'), shoes = g('schuhe')
  let upper = (top?.warmth ?? 0) + (dress?.warmth ?? 0) + (under ? under.warmth * 0.7 : 0)
  if (dress && !top && !under && dress.sleeves === 'ohne') upper -= 0.5
  let lower = 0
  if (bottom) {
    lower = bottom.warmth
    if (bottom.bottomType === 'shorts') lower = Math.min(lower, 1)
    if (bottom.bottomType === 'rock' && bottom.length === 'kurz') lower -= 1
  } else if (dress) {
    lower = dress.length === 'kurz' ? 0.5 : dress.length === 'lang' ? 2.5 : 1.5
  }
  if (bottomUnder) lower += bottomUnder.warmth * 0.7
  return upper + Math.max(0, lower) * 0.5 + (shoes ? shoes.warmth * 0.3 : 0)
}

export const jacketWarmth = (j?: Item) => (j ? j.warmth * 1.6 : 0)

/* ---------- Kurze Teile ---------- */

function shortInfo(p: OutfitParts, by: ById) {
  const dress = p.kleid ? by.get(p.kleid) : undefined
  const bottom = p.unterteil ? by.get(p.unterteil) : undefined
  const shortDress = dress?.length === 'kurz'
  const shortSkirt = !dress && bottom?.bottomType === 'rock' && bottom.length === 'kurz'
  const isShort = !!(shortDress || shortSkirt)
  const hasUnder = shortDress ? !!bottom : shortSkirt ? !!p.unterteilDrunter : false
  return { isShort, hasUnder }
}

/** Darf das Outfit so getragen werden? (harte Regeln) */
export function isAllowed(p: OutfitParts, by: ById, s: Settings, w?: DayWeather): boolean {
  const { isShort, hasUnder } = shortInfo(p, by)
  if (isShort && !hasUnder) {
    const max = w?.max ?? 15
    if (s.shortRule === 'immer') return false
    if (s.shortRule === 'wetter' && max < 18) return false
    if (s.shortRule === 'ohne' && max < 10) return false
  }
  return true
}

/* ---------- Features fürs Lernen ---------- */

export function features(p: OutfitParts, by: ById): string[] {
  const f: string[] = []
  const { isShort, hasUnder } = shortInfo(p, by)
  if (isShort) f.push(hasUnder ? 'kurzMitDrunter' : 'kurzOhne')
  const dress = p.kleid ? by.get(p.kleid) : undefined
  if (dress && p.unterteil) f.push('kleidMitUnterteil')
  if (dress && !p.unterteil) f.push('kleidAllein')
  if (p.unterschicht) f.push('mitUnterschicht')
  if ((dress?.sleeves === 'ohne' || dress?.sleeves === 'kurz') && !p.unterschicht) f.push('kleidOhneAermelDrunter')
  if (p.jacke) f.push('mitJacke')
  const jewelry = JEWELRY_SLOTS.filter((s) => p[s]).length
  f.push(jewelry === 0 ? 'ohneSchmuck' : jewelry >= 3 ? 'vielSchmuck' : 'etwasSchmuck')
  return f
}

/* ---------- Bewertung ---------- */

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export interface Scored {
  parts: OutfitParts
  template: Template
  score: number
}

export function colorScore(p: OutfitParts, by: ById): number {
  const vis = (['unterschicht', 'oberteil', 'kleid', 'unterteil', 'jacke', 'hijab'] as Slot[])
    .map((s) => (p[s] ? by.get(p[s]!) : undefined))
    .filter(Boolean) as Item[]
  const bright = [...new Map(vis.filter((i) => !neutrals.has(i.colorName)).map((i) => [i.colorName, i])).values()]
  let sc = 0
  if (bright.length <= 1) sc += 1
  else if (bright.length === 2) {
    let d = Math.abs(hue(bright[0].color) - hue(bright[1].color))
    d = Math.min(d, 360 - d)
    sc += d < 40 ? 0.6 : d > 150 ? 0.2 : -0.5
  } else sc -= bright.length === 3 ? 1.2 : 2.5
  // Hijab passend zu einem anderen Teil oder neutral
  const hij = p.hijab ? by.get(p.hijab) : undefined
  if (hij) {
    const others = vis.filter((i) => i !== hij)
    if (neutrals.has(hij.colorName) || others.some((o) => o.colorName === hij.colorName)) sc += 0.5
  }
  return sc
}

export function score(
  p: OutfitParts,
  template: Template,
  by: ById,
  prefs: Preferences,
  w: DayWeather | undefined,
  now = Date.now(),
): number {
  let sc = 0
  const items = Object.entries(p).map(([slot, id]) => [slot as Slot, by.get(id!)!] as const).filter(([, i]) => i)

  /* Wetter */
  if (w) {
    const W = bodyWarmth(p, by)
    const J = jacketWarmth(p.jacke ? by.get(p.jacke) : undefined)
    const nMax = need(w.max), nMin = need(w.min)
    const diffMax = W - nMax
    // ohne Jacke zur wärmsten Zeit: nicht zu warm, nicht zu kalt
    // lieber minimal zu warm als zu kalt
    if (diffMax > 1.5) sc -= (diffMax - 1.5) * 1.4
    if (diffMax < -0.5) sc -= p.jacke ? (-diffMax - 0.5) * 1.4 : (-diffMax - 0.5) * 1.8
    // zur kältesten Zeit (mit Jacke, falls vorhanden)
    const deficit = nMin - (W + J)
    if (deficit > 0) sc -= deficit * 2
    if (p.jacke && W + J - nMin > 2) sc -= (W + J - nMin - 2) * 1.1 // Jacke zu warm
    if (p.jacke && nMin - W < 0) sc -= 0.8 // Jacke unnötig
    if (w.rain) {
      const j = p.jacke ? by.get(p.jacke) : undefined
      const s = p.schuhe ? by.get(p.schuhe) : undefined
      if (j?.waterproof) sc += 1
      if (s?.waterproof) sc += 0.8
    }
    const shoes = p.schuhe ? by.get(p.schuhe) : undefined
    if (shoes) {
      if (w.min < 5 && shoes.warmth < 3) sc -= (3 - shoes.warmth) * 0.6
      if (w.max > 24 && shoes.warmth > 3) sc -= (shoes.warmth - 3) * 0.6
    }
    const dress = p.kleid ? by.get(p.kleid) : undefined
    if (dress && dress.sleeves !== 'lang' && !p.unterschicht && w.max < 16) sc -= 1.2
    const { isShort, hasUnder } = shortInfo(p, by)
    if (isShort && hasUnder && w.max >= 26) sc -= 0.4
  }

  /* Farben */
  sc += colorScore(p, by)

  /* Stil-Tags: gleicher Stil passt zusammen */
  const mainTags = items.filter(([s]) => MAIN_SLOTS.includes(s)).map(([, i]) => i.tags)
  const tagCount = new Map<string, number>()
  mainTags.flat().forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1))
  for (const n of tagCount.values()) if (n >= 2) sc += 0.25 * Math.min(n - 1, 3)
  const all = new Set(mainTags.flat())
  if (all.has('sportlich') && (all.has('elegant') || all.has('schick'))) sc -= 0.8

  /* Layering-Details */
  const under = p.unterschicht ? by.get(p.unterschicht) : undefined
  const over = p.oberteil ? by.get(p.oberteil) : undefined
  if (under && over && under.warmth > over.warmth + 1) sc -= 0.6

  /* Gelernte Vorlieben */
  for (const [, i] of items) sc += (prefs.item[i.id] ?? 0) * 0.35
  const ids = items.filter(([s]) => MAIN_SLOTS.includes(s)).map(([, i]) => i)
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) {
      sc += (prefs.pair[pairKey(ids[a].id, ids[b].id)] ?? 0) * 0.5
      sc += (prefs.color[pairKey(ids[a].colorName, ids[b].colorName)] ?? 0) * 0.2
    }
  for (const t of all) sc += (prefs.tag[t] ?? 0) * 0.15
  sc += (prefs.template[template] ?? 0) * 0.35
  for (const f of features(p, by)) sc += (prefs.feature[f] ?? 0) * 0.4

  /* Abwechslung: kürzlich getragene Sachen seltener */
  for (const [slot, i] of items) {
    if (!i.lastWorn) continue
    const days = (now - i.lastWorn) / 86400000
    const f = JEWELRY_SLOTS.includes(slot) || slot === 'schuhe' || slot === 'jacke' ? 0.15 : 1
    if (days < 1) sc -= 3 * f
    else if (days < 2) sc -= 1.5 * f
    else if (days < 4) sc -= 0.6 * f
  }
  return sc
}

/* ---------- Kandidaten erzeugen ---------- */

const pick = <T,>(a: T[]): T | undefined => a[Math.floor(Math.random() * a.length)]

export interface Pools {
  tops: Item[]
  unders: Item[]
  overs: Item[]
  bottoms: Item[]
  bottomUnders: Item[]
  dresses: Item[]
  jackets: Item[]
  shoes: Item[]
  hijabs: Item[]
  ring: Item[]
  armband: Item[]
  kette: Item[]
  guertel: Item[]
}

export function pools(items: Item[]): Pools {
  const c = (k: Item['category']) => items.filter((i) => i.category === k)
  const tops = c('oberteil')
  const bottoms = c('unterteil')
  return {
    tops: tops.filter((t) => t.layer !== 'drunter'),
    unders: tops.filter((t) => t.layer === 'drunter' || t.layer === 'beides'),
    overs: tops.filter((t) => t.layer === 'drueber' || t.layer === 'beides'),
    bottoms: bottoms.filter((b) => b.bottomType !== 'leggings'),
    bottomUnders: bottoms.filter((b) => b.bottomType === 'leggings' || b.bottomType === 'hose'),
    dresses: c('kleid'),
    jackets: c('jacke'),
    shoes: c('schuhe'),
    hijabs: c('hijab'),
    ring: c('ring'),
    armband: c('armband'),
    kette: c('kette'),
    guertel: c('guertel'),
  }
}

/** Was passt unter ein Kleid? Unter kurze Kleider alles, unter längere nur Hose/Leggings */
function bottomsForDress(d: Item, P: Pools): Item[] {
  const all = [...new Map([...P.bottoms, ...P.bottomUnders].map((b) => [b.id, b])).values()]
  return d.length === 'kurz' ? all : all.filter((b) => b.bottomType === 'hose' || b.bottomType === 'leggings')
}

export function availableTemplates(P: Pools, s: Settings): { t: Template; w: number }[] {
  const lw = s.layering === 'nie' ? 0 : s.layering === 'oft' ? 1.2 : 0.4
  const out: { t: Template; w: number }[] = []
  if (P.tops.length && P.bottoms.length) out.push({ t: 'einfach', w: 1 })
  if (P.dresses.length) out.push({ t: 'kleid', w: 0.8 })
  if (lw && P.unders.length && P.overs.length && P.bottoms.length && P.unders.length + P.overs.length >= 2)
    out.push({ t: 'layering', w: lw })
  if (lw && P.dresses.length && P.unders.length) out.push({ t: 'kleidLayering', w: lw })
  return out
}

function chooseTemplate(list: { t: Template; w: number }[], prefs: Preferences): Template {
  const ws = list.map((x) => x.w * Math.exp(Math.max(-2, Math.min(2, (prefs.template[x.t] ?? 0) * 0.25))))
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i].t
  return list[0].t
}

function randomCandidate(t: Template, P: Pools, s: Settings, w?: DayWeather): OutfitParts | null {
  const p: OutfitParts = {}
  if (t === 'einfach') {
    p.oberteil = pick(P.tops)?.id
    p.unterteil = pick(P.bottoms)?.id
  } else if (t === 'layering') {
    const u = pick(P.unders), o = pick(P.overs.filter((x) => x.id !== u?.id))
    if (!u || !o) return null
    p.unterschicht = u.id
    p.oberteil = o.id
    p.unterteil = pick(P.bottoms)?.id
  } else {
    const d = pick(P.dresses)!
    p.kleid = d.id
    if (t === 'kleidLayering') p.unterschicht = pick(P.unders)?.id
    // Unterteil unter dem Kleid: bei kurzen Kleidern oft, sonst manchmal
    const chance = d.length === 'kurz' ? 0.65 : 0.3
    if (Math.random() < chance) {
      p.unterteil = pick(bottomsForDress(d, P))?.id
    }
  }
  // Leggings / Hose unter kurzem Rock
  const b = p.unterteil ? [...P.bottoms, ...P.bottomUnders].find((x) => x.id === p.unterteil) : undefined
  if (!p.kleid && b?.bottomType === 'rock' && b.length === 'kurz' && Math.random() < 0.6) {
    p.unterteilDrunter = pick(P.bottomUnders.filter((x) => x.id !== b.id))?.id
  }
  const cold = (w?.min ?? 12) < 20
  if (P.jackets.length && Math.random() < (cold ? 0.75 : 0.15)) p.jacke = pick(P.jackets)?.id
  p.schuhe = pick(P.shoes)?.id
  if (s.hijab) p.hijab = pick(P.hijabs)?.id
  if (s.jewelry) {
    if (Math.random() < 0.5) p.ring = pick(P.ring)?.id
    if (Math.random() < 0.45) p.armband = pick(P.armband)?.id
    if (Math.random() < 0.45) p.kette = pick(P.kette)?.id
    if ((p.unterteil || p.kleid) && Math.random() < 0.35) p.guertel = pick(P.guertel)?.id
  }
  for (const k of Object.keys(p) as Slot[]) if (!p[k]) delete p[k]
  return p
}

export const outfitKey = (p: OutfitParts) =>
  (Object.keys(p) as Slot[]).sort().map((k) => `${k}:${p[k]}`).join(',')

export function suggest(
  items: Item[],
  prefs: Preferences,
  s: Settings,
  w: DayWeather | undefined,
  avoid: Set<string> = new Set(),
  tries = 600,
): Scored | null {
  const by: ById = new Map(items.map((i) => [i.id, i]))
  const P = pools(items)
  const temps = availableTemplates(P, s)
  if (!temps.length) return null
  const seen = new Map<string, Scored>()
  for (let n = 0; n < tries; n++) {
    const t = chooseTemplate(temps, prefs)
    const p = randomCandidate(t, P, s, w)
    if (!p || !isAllowed(p, by, s, w)) continue
    const k = outfitKey(p)
    if (seen.has(k) || avoid.has(k)) continue
    seen.set(k, { parts: p, template: t, score: score(p, t, by, prefs, w) })
  }
  const list = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 6)
  if (!list.length) return null
  // etwas Zufall unter den besten, damit es abwechslungsreich bleibt
  const ws = list.map((x) => Math.exp((x.score - list[0].score) * 1.2))
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i]
  return list[0]
}

/** Ein einzelnes Teil neu würfeln */
export function rerollSlot(
  current: Scored,
  slot: Slot,
  items: Item[],
  prefs: Preferences,
  s: Settings,
  w?: DayWeather,
): Scored {
  const by: ById = new Map(items.map((i) => [i.id, i]))
  const P = pools(items)
  const opts: Record<Slot, Item[]> = {
    unterschicht: P.unders,
    oberteil: current.parts.unterschicht ? P.overs : P.tops,
    kleid: P.dresses,
    unterteil: current.parts.kleid ? bottomsForDress(by.get(current.parts.kleid)!, P) : P.bottoms,
    unterteilDrunter: P.bottomUnders,
    jacke: P.jackets,
    schuhe: P.shoes,
    hijab: P.hijabs,
    ring: P.ring,
    armband: P.armband,
    kette: P.kette,
    guertel: P.guertel,
  }
  const used = new Set(Object.values(current.parts))
  const cands = [...new Map(opts[slot].map((i) => [i.id, i])).values()].filter(
    (i) => i.id !== current.parts[slot] && !used.has(i.id),
  )
  const scored = cands
    .map((i) => {
      const parts = { ...current.parts, [slot]: i.id }
      return { parts, template: current.template, score: score(parts, current.template, by, prefs, w) }
    })
    .filter((x) => isAllowed(x.parts, by, s, w))
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return current
  return pick(scored.slice(0, 3))!
}

/** Optionales Teil hinzufügen / entfernen */
export function toggleSlot(
  current: Scored,
  slot: Slot,
  items: Item[],
  prefs: Preferences,
  s: Settings,
  w?: DayWeather,
): Scored {
  if (current.parts[slot]) {
    const parts = { ...current.parts }
    delete parts[slot]
    const by: ById = new Map(items.map((i) => [i.id, i]))
    if (!isAllowed(parts, by, s, w)) return current
    let template = current.template
    if (slot === 'unterschicht') template = template === 'layering' ? 'einfach' : template === 'kleidLayering' ? 'kleid' : template
    return { parts, template, score: score(parts, template, by, prefs, w) }
  }
  const tmp: Scored = { ...current, parts: { ...current.parts } }
  let template = current.template
  if (slot === 'unterschicht') template = template === 'einfach' ? 'layering' : template === 'kleid' ? 'kleidLayering' : template
  const r = rerollSlot({ ...tmp, template }, slot, items, prefs, s, w)
  return r
}

/* ---------- Lernen ---------- */

const clamp = (v: number) => Math.max(-6, Math.min(6, v))
const bump = (m: Record<string, number>, k: string, d: number) => (m[k] = clamp((m[k] ?? 0) + d))

export function learn(prefs: Preferences, o: { parts: OutfitParts; template: Template }, items: Item[], delta: number): Preferences {
  const by: ById = new Map(items.map((i) => [i.id, i]))
  const next: Preferences = JSON.parse(JSON.stringify(prefs))
  const list = (Object.entries(o.parts) as [Slot, string][]).map(([s, id]) => [s, by.get(id)] as const).filter(([, i]) => i) as [Slot, Item][]
  for (const [, i] of list) bump(next.item, i.id, delta * 0.4)
  const main = list.filter(([s]) => MAIN_SLOTS.includes(s)).map(([, i]) => i)
  for (let a = 0; a < main.length; a++)
    for (let b = a + 1; b < main.length; b++) {
      bump(next.pair, pairKey(main[a].id, main[b].id), delta * 0.5)
      if (main[a].colorName !== main[b].colorName || !neutrals.has(main[a].colorName))
        bump(next.color, pairKey(main[a].colorName, main[b].colorName), delta * 0.25)
    }
  for (const t of new Set(main.flatMap((i) => i.tags))) bump(next.tag, t, delta * 0.2)
  bump(next.template, o.template, delta * 0.3)
  for (const f of features(o.parts, by)) bump(next.feature, f, delta * 0.35)
  return next
}

/** Kleiner Abzug, wenn ein Teil weggewürfelt wird */
export function learnReject(prefs: Preferences, itemId: string): Preferences {
  const next: Preferences = JSON.parse(JSON.stringify(prefs))
  bump(next.item, itemId, -0.1)
  return next
}

/* ---------- Tipps zum Wetter ---------- */

export function weatherTips(p: OutfitParts, items: Item[], w: DayWeather): string[] {
  const by: ById = new Map(items.map((i) => [i.id, i]))
  const tips: string[] = []
  const W = bodyWarmth(p, by)
  const j = p.jacke ? by.get(p.jacke) : undefined
  const spread = w.max - w.min
  if (j) {
    if (need(w.max) <= W + 0.6 && spread >= 5)
      tips.push(`Morgens ${w.min}° → mit ${j.name || 'Jacke'}. Ab ca. ${w.maxHour} Uhr ${w.max}° → Jacke kann aus.`)
    else if (need(w.max) > W + 0.6) tips.push(`Heute bleibt es kühl (max. ${w.max}°) – die Jacke am besten anlassen.`)
    else tips.push(`Jacke für die kühleren Stunden (${w.min}°).`)
  } else if (need(w.min) > W + 1.5) {
    tips.push(`Morgens wird es mit ${w.min}° frisch – nimm dir etwas zum Drüberziehen mit.`)
  }
  if (w.rain) tips.push(`Regenwahrscheinlichkeit ${w.rainProb} % – ${j?.waterproof ? 'die Jacke ist wasserfest 👍' : 'denk an einen Schirm ☂️'}`)
  if (p.unterschicht && spread >= 6) tips.push('Zwiebellook: Wenn es warm wird, kannst du eine Schicht ausziehen.')
  return tips
}

export const emptyOutfit = (parts: OutfitParts, template: Template, id: string): Outfit => ({
  id,
  parts,
  template,
  createdAt: Date.now(),
  saved: false,
  wornDates: [],
})
