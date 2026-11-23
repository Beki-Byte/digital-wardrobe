/** Bildverarbeitung – läuft komplett auf dem Gerät, nichts wird hochgeladen. */

const MAX = 700

export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Bild verkleinern und als Canvas zurückgeben */
export function toCanvas(img: HTMLImageElement, max = MAX): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * scale)
  c.height = Math.round(img.naturalHeight * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c
}

const dist = (d: Uint8ClampedArray, i: number, r: number, g: number, b: number) => {
  const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.7
}

/**
 * Entfernt einen möglichst einfarbigen Hintergrund (Bett, Boden, Wand),
 * indem vom Bildrand aus ähnliche Farben "geflutet" werden.
 * tolerance: 5–80
 */
export function removeBackground(src: HTMLCanvasElement, tolerance = 30): HTMLCanvasElement {
  const w = src.width, h = src.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data

  // Hintergrundfarbe = Median der Randpixel
  const border: number[][] = []
  const step = Math.max(1, Math.floor((w + h) / 400))
  for (let x = 0; x < w; x += step) {
    for (const y of [0, h - 1]) {
      const i = (y * w + x) * 4
      border.push([d[i], d[i + 1], d[i + 2]])
    }
  }
  for (let y = 0; y < h; y += step) {
    for (const x of [0, w - 1]) {
      const i = (y * w + x) * 4
      border.push([d[i], d[i + 1], d[i + 2]])
    }
  }
  const med = (k: number) => border.map((p) => p[k]).sort((a, b) => a - b)[border.length >> 1]
  const br = med(0), bg = med(1), bb = med(2)

  const globalTol = tolerance * 2.2
  const localTol = tolerance * 0.6
  const mask = new Uint8Array(w * h) // 1 = Hintergrund
  const queue = new Int32Array(w * h)
  let qh = 0, qt = 0
  const tryPush = (p: number, from: number) => {
    if (mask[p]) return
    const i = p * 4
    if (dist(d, i, br, bg, bb) > globalTol) return
    if (from >= 0) {
      const j = from * 4
      if (dist(d, i, d[j], d[j + 1], d[j + 2]) > localTol) return
    }
    mask[p] = 1
    queue[qt++] = p
  }
  for (let x = 0; x < w; x++) {
    tryPush(x, -1)
    tryPush((h - 1) * w + x, -1)
  }
  for (let y = 0; y < h; y++) {
    tryPush(y * w, -1)
    tryPush(y * w + w - 1, -1)
  }
  while (qh < qt) {
    const p = queue[qh++]
    const x = p % w, y = (p - x) / w
    if (x > 0) tryPush(p - 1, p)
    if (x < w - 1) tryPush(p + 1, p)
    if (y > 0) tryPush(p - w, p)
    if (y < h - 1) tryPush(p + w, p)
  }

  // weiche Kanten: Alpha nach Anzahl Hintergrund-Nachbarn
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (mask[p]) {
        d[p * 4 + 3] = 0
        continue
      }
      let n = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && mask[yy * w + xx]) n++
        }
      if (n) d[p * 4 + 3] = Math.round(255 * (1 - n / 12))
    }
  }
  ctx.putImageData(img, 0, 0)
  return cropToContent(c)
}

/** Schneidet transparente Ränder ab */
function cropToContent(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d')!
  const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height)
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 <= x0 || y1 <= y0) return c
  const pad = 6
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

/** Hauptfarbe des Kleidungsstücks (nur sichtbare Pixel, Mitte stärker gewichtet) */
export function dominantColor(c: HTMLCanvasElement): string {
  const { data, width: w, height: h } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 20000)))
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 200) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
      const cx = x / w - 0.5, cy = y / h - 0.5
      const wgt = 1.5 - Math.sqrt(cx * cx + cy * cy)
      const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      e.n += wgt; e.r += r * wgt; e.g += g * wgt; e.b += b * wgt
      bins.set(key, e)
    }
  let best = { n: 0, r: 128, g: 128, b: 128 }
  for (const e of bins.values()) if (e.n > best.n) best = e
  const hex = (v: number) => Math.round(best.n ? v / best.n : v).toString(16).padStart(2, '0')
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`
}

export const canvasToBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'))

/* ---------- Farbnamen ---------- */

export const palette: { name: string; hex: string }[] = [
  { name: 'Schwarz', hex: '#1a1a1a' },
  { name: 'Weiß', hex: '#f5f5f2' },
  { name: 'Grau', hex: '#8a8a8a' },
  { name: 'Creme', hex: '#efe6d2' },
  { name: 'Beige', hex: '#d2b48c' },
  { name: 'Braun', hex: '#7a4e2d' },
  { name: 'Rot', hex: '#c62828' },
  { name: 'Bordeaux', hex: '#6d1a2a' },
  { name: 'Rosa', hex: '#f2a7c0' },
  { name: 'Pink', hex: '#e0408a' },
  { name: 'Orange', hex: '#ef7d22' },
  { name: 'Gelb', hex: '#f2cf3a' },
  { name: 'Senf', hex: '#c49a2c' },
  { name: 'Grün', hex: '#3d8b48' },
  { name: 'Oliv', hex: '#6b6b35' },
  { name: 'Mint', hex: '#a8dcc5' },
  { name: 'Türkis', hex: '#2aa5a0' },
  { name: 'Hellblau', hex: '#9cc6e8' },
  { name: 'Blau', hex: '#2f5fb8' },
  { name: 'Jeansblau', hex: '#4a6a8f' },
  { name: 'Dunkelblau', hex: '#1d2b4f' },
  { name: 'Lila', hex: '#7b4ea3' },
  { name: 'Flieder', hex: '#c3a8dc' },
  { name: 'Gold', hex: '#cfa94a' },
  { name: 'Silber', hex: '#c0c4c8' },
]

/** Farben, die zu (fast) allem passen */
export const neutrals = new Set(['Schwarz', 'Weiß', 'Grau', 'Creme', 'Beige', 'Braun', 'Dunkelblau', 'Jeansblau', 'Gold', 'Silber'])

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

export function colorName(hex: string): string {
  const [r, g, b] = rgb(hex)
  let best = palette[0], bd = Infinity
  for (const p of palette) {
    const [pr, pg, pb] = rgb(p.hex)
    const rm = (r + pr) / 2
    const dd = (2 + rm / 256) * (r - pr) ** 2 + 4 * (g - pg) ** 2 + (2 + (255 - rm) / 256) * (b - pb) ** 2
    if (dd < bd) { bd = dd; best = p }
  }
  return best.name
}

export function hue(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx === mn) return 0
  const dd = mx - mn
  let h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4
  return h * 60
}
