import { categoryIcons, slotLabels } from '../labels'
import type { Item, OutfitParts, Settings, Slot } from '../types'
import { ItemImage } from './ItemImage'

const MAIN_ORDER: Slot[] = ['hijab', 'unterschicht', 'oberteil', 'kleid', 'unterteil', 'unterteilDrunter', 'schuhe']
const SIDE_ORDER: Slot[] = ['jacke', 'kette', 'armband', 'ring', 'guertel']

interface Props {
  parts: OutfitParts
  items: Item[]
  settings: Settings
  onReroll?: (s: Slot) => void
  onToggle?: (s: Slot) => void
}

export function OutfitView({ parts, items, settings, onReroll, onToggle }: Props) {
  const by = new Map(items.map((i) => [i.id, i]))
  const cat = (c: Item['category']) => items.some((i) => i.category === c)
  const bottom = parts.unterteil ? by.get(parts.unterteil) : undefined

  const required = (s: Slot) =>
    (s === 'oberteil' && !parts.kleid) || s === 'kleid' || (s === 'unterteil' && !parts.kleid)

  // Optionen, die man hinzufügen kann
  const addable: Slot[] = []
  if (!parts.jacke && cat('jacke')) addable.push('jacke')
  if (!parts.unterschicht && items.some((i) => i.category === 'oberteil' && i.layer !== 'drueber' && i.id !== parts.oberteil))
    addable.push('unterschicht')
  if (parts.kleid && !parts.unterteil && cat('unterteil')) addable.push('unterteil')
  if (!parts.kleid && bottom?.bottomType === 'rock' && !parts.unterteilDrunter &&
      items.some((i) => i.bottomType === 'leggings' || (i.bottomType === 'hose' && i.id !== bottom.id)))
    addable.push('unterteilDrunter')
  if (!parts.schuhe && cat('schuhe')) addable.push('schuhe')
  if (settings.hijab && !parts.hijab && cat('hijab')) addable.push('hijab')
  for (const s of ['kette', 'armband', 'ring', 'guertel'] as Slot[]) if (!parts[s] && cat(s as Item['category'])) addable.push(s)

  const tile = (s: Slot, small = false) => {
    const id = parts[s]
    if (!id) return null
    const item = by.get(id)
    return (
      <div key={s} className={`tile ${small ? 'small' : ''} slot-${s}`}>
        <ItemImage item={item} className="tile-img" />
        <div className="tile-label">{slotLabels[s]}</div>
        {(onReroll || onToggle) && (
          <div className="tile-actions">
            {onReroll && (
              <button className="icon-btn" onClick={() => onReroll(s)} aria-label={`${slotLabels[s]} tauschen`} title="Tauschen">
                🔄
              </button>
            )}
            {onToggle && !required(s) && (
              <button className="icon-btn" onClick={() => onToggle(s)} aria-label={`${slotLabels[s]} entfernen`} title="Weglassen">
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const sideTiles = SIDE_ORDER.map((s) => tile(s, true)).filter(Boolean)

  return (
    <div className="outfit">
      <div className={`outfit-grid ${sideTiles.length ? '' : 'no-side'}`}>
        <div className="outfit-main">{MAIN_ORDER.map((s) => tile(s))}</div>
        {sideTiles.length > 0 && <div className="outfit-side">{sideTiles}</div>}
      </div>
      {onToggle && addable.length > 0 && (
        <div className="addables">
          <span className="muted">Dazu nehmen:</span>
          <div className="chips wrap">
            {addable.map((s) => (
              <button key={s} className="chip small" onClick={() => onToggle(s)}>
                + {iconFor(s)} {slotLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const iconFor = (s: Slot) =>
  s === 'unterschicht' ? '👕' : s === 'unterteilDrunter' ? '🧦' : categoryIcons[(s === 'oberteil' ? 'oberteil' : s) as Item['category']] ?? ''

/** Kleine Collage für die Outfit-Liste */
export function OutfitThumb({ parts, items }: { parts: OutfitParts; items: Item[] }) {
  const by = new Map(items.map((i) => [i.id, i]))
  const order: Slot[] = ['hijab', 'unterschicht', 'oberteil', 'kleid', 'unterteil', 'jacke', 'schuhe']
  const list = order.map((s) => parts[s] && by.get(parts[s]!)).filter(Boolean) as Item[]
  return (
    <div className="thumb">
      {list.slice(0, 6).map((i) => (
        <ItemImage key={i.id} item={i} />
      ))}
    </div>
  )
}
