import { useEffect, useRef, useState } from 'react'
import { uid } from '../db'
import { canvasToBlob, colorName, dominantColor, loadImage, palette, removeBackground, toCanvas } from '../image'
import {
  bottomLabels,
  categoryIcons,
  categoryLabels,
  layerLabels,
  lengthLabels,
  sleeveLabels,
  styleTags,
  warmthLabels,
} from '../labels'
import { useStore } from '../store'
import type { BottomType, Category, Item, LayerRole, Length, Sleeves } from '../types'
import { blobUrl } from './ItemImage'

const warmthDefaults: Record<Category, number> = {
  oberteil: 2, unterteil: 3, kleid: 2, jacke: 4, schuhe: 3, hijab: 1,
  ring: 1, armband: 1, kette: 1, guertel: 1,
}
const JEWELRY: Category[] = ['ring', 'armband', 'kette', 'guertel']

interface Props {
  existing?: Item
  onDone: (saved: Item | null) => void
}

export function ItemForm({ existing, onDone }: Props) {
  const { saveItem, removeItem, settings } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const [orig, setOrig] = useState<HTMLCanvasElement | null>(null)
  const [removeBg, setRemoveBg] = useState(true)
  const [tol, setTol] = useState(28)
  const [processed, setProcessed] = useState<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState<string | undefined>(existing ? blobUrl(existing.image) : undefined)
  const [busy, setBusy] = useState(false)

  const [category, setCategory] = useState<Category | undefined>(existing?.category)
  const [name, setName] = useState(existing?.name ?? '')
  const [color, setColor] = useState(existing?.color ?? '#888888')
  const [cName, setCName] = useState(existing?.colorName ?? '')
  const [warmth, setWarmth] = useState(existing?.warmth ?? 2)
  const [length, setLength] = useState<Length>(existing?.length ?? 'mittel')
  const [sleeves, setSleeves] = useState<Sleeves>(existing?.sleeves ?? 'kurz')
  const [layer, setLayer] = useState<LayerRole>(existing?.layer ?? 'beides')
  const [bottomType, setBottomType] = useState<BottomType>(existing?.bottomType ?? 'hose')
  const [waterproof, setWaterproof] = useState(existing?.waterproof ?? false)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])

  // Hintergrund entfernen / Vorschau aktualisieren
  useEffect(() => {
    if (!orig) return
    const t = setTimeout(() => {
      const out = removeBg ? removeBackground(orig, tol) : orig
      setProcessed(out)
      setPreview(out.toDataURL('image/png'))
      const hex = dominantColor(out)
      setColor(hex)
      setCName(colorName(hex))
    }, 120)
    return () => clearTimeout(t)
  }, [orig, removeBg, tol])

  async function onFile(f?: File) {
    if (!f) return
    setBusy(true)
    try {
      const img = await loadImage(f)
      setOrig(toCanvas(img))
    } catch {
      alert('Das Bild konnte nicht geladen werden.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!category) return
    setBusy(true)
    const image = processed ? await canvasToBlob(processed) : existing!.image
    const item: Item = {
      id: existing?.id ?? uid(),
      category,
      name: name.trim(),
      image,
      color,
      colorName: cName || colorName(color),
      warmth: JEWELRY.includes(category) ? 1 : warmth,
      length: ['kleid', 'oberteil'].includes(category) || (category === 'unterteil' && bottomType === 'rock') ? length : undefined,
      sleeves: ['kleid', 'oberteil'].includes(category) ? sleeves : undefined,
      layer: category === 'oberteil' ? layer : undefined,
      bottomType: category === 'unterteil' ? bottomType : undefined,
      waterproof: ['jacke', 'schuhe'].includes(category) ? waterproof : undefined,
      tags,
      createdAt: existing?.createdAt ?? Date.now(),
      lastWorn: existing?.lastWorn,
      wornCount: existing?.wornCount ?? 0,
    }
    await saveItem(item)
    setBusy(false)
    onDone(item)
  }

  const cats = (Object.keys(categoryLabels) as Category[]).filter((c) => c !== 'hijab' || settings.hijab || existing?.category === 'hijab')
  const hasImage = !!preview

  return (
    <div className="form">
      {/* Foto */}
      <div className="photo-box">
        {hasImage ? (
          <img src={preview} alt="Vorschau" className="photo-preview checker" />
        ) : (
          <div className="photo-empty">
            <div className="big-icon">📸</div>
            <p>Leg das Teil am besten auf einen <b>einfarbigen Untergrund</b> (Bett, Boden, Wand) – dann klappt das Freistellen am besten.</p>
          </div>
        )}
        <div className="row gap">
          <button className="btn primary" onClick={() => camRef.current?.click()} disabled={busy}>
            📷 Foto machen
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            🖼️ Aus Galerie
          </button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {orig && (
          <div className="bg-controls">
            <label className="switch">
              <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
              <span>Hintergrund entfernen</span>
            </label>
            {removeBg && (
              <label className="slider">
                <span>Stärke</span>
                <input type="range" min={6} max={70} value={tol} onChange={(e) => setTol(+e.target.value)} />
              </label>
            )}
          </div>
        )}
      </div>

      {hasImage && (
        <>
          <h3>Was ist das?</h3>
          <div className="chips wrap">
            {cats.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? 'on' : ''}`}
                onClick={() => {
                  setCategory(c)
                  if (!existing) setWarmth(warmthDefaults[c])
                }}
              >
                {categoryIcons[c]} {categoryLabels[c]}
              </button>
            ))}
          </div>
        </>
      )}

      {category && (
        <>
          <label className="field">
            <span>Name (optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Weiße Bluse" />
          </label>

          <div className="field">
            <span>Farbe</span>
            <div className="chips wrap colors">
              {palette.map((p) => (
                <button
                  key={p.name}
                  className={`swatch ${cName === p.name ? 'on' : ''}`}
                  style={{ background: p.hex }}
                  title={p.name}
                  aria-label={p.name}
                  onClick={() => {
                    setCName(p.name)
                    setColor(p.hex)
                  }}
                />
              ))}
            </div>
            <small className="muted">Erkannt: {cName || '–'} · tippe zum Ändern</small>
          </div>

          {category === 'unterteil' && (
            <Choice label="Art" value={bottomType} options={bottomLabels} onChange={setBottomType} />
          )}
          {(category === 'kleid' || category === 'oberteil' || (category === 'unterteil' && bottomType === 'rock')) && (
            <Choice label="Länge" value={length} options={lengthLabels} onChange={setLength} />
          )}
          {(category === 'kleid' || category === 'oberteil') && (
            <Choice label="Ärmel" value={sleeves} options={sleeveLabels} onChange={setSleeves} />
          )}
          {category === 'oberteil' && (
            <Choice
              label="Layering – wie trägst du es?"
              hint="Drunter = z. B. Hemd unter Pulli oder Kleid · Drüber = z. B. Pulli"
              value={layer}
              options={layerLabels}
              onChange={setLayer}
            />
          )}

          {!JEWELRY.includes(category) && (
            <div className="field">
              <span>Wärme: {warmthLabels[warmth]}</span>
              <div className="warmth">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={`chip ${warmth === n ? 'on' : ''}`} onClick={() => setWarmth(n)}>
                    {n === 1 ? '☀️' : n === 5 ? '❄️' : n}
                  </button>
                ))}
              </div>
              <small className="muted">1 = T-Shirt/Sandalen · 3 = Jeans/Pulli · 5 = Wintermantel/Stiefel</small>
            </div>
          )}

          {(category === 'jacke' || category === 'schuhe') && (
            <label className="switch">
              <input type="checkbox" checked={waterproof} onChange={(e) => setWaterproof(e.target.checked)} />
              <span>Wasserfest / regentauglich</span>
            </label>
          )}

          <div className="field">
            <span>Stil (optional)</span>
            <div className="chips wrap">
              {styleTags.map((t) => (
                <button
                  key={t}
                  className={`chip small ${tags.includes(t) ? 'on' : ''}`}
                  onClick={() => setTags((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="row gap sticky-actions">
            <button className="btn primary grow" onClick={save} disabled={busy}>
              {existing ? 'Speichern' : 'In den Schrank'}
            </button>
            {existing && (
              <button
                className="btn danger"
                onClick={async () => {
                  if (confirm('Dieses Teil wirklich löschen?')) {
                    await removeItem(existing.id)
                    onDone(null)
                  }
                }}
              >
                Löschen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Choice<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: T
  options: Record<T, string>
  onChange: (v: T) => void
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips wrap">
        {(Object.keys(options) as T[]).map((k) => (
          <button key={k} className={`chip ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>
            {options[k]}
          </button>
        ))}
      </div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}
