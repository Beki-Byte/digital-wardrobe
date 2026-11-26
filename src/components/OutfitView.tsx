import { outfitKey } from '../engine'
import { slotLabels } from '../labels'
import type { Item, OutfitParts, Settings, Slot } from '../types'
import { Icon, type IconName } from './Icon'
import { ItemImage } from './ItemImage'

const MAIN_ORDER: Slot[] = ['hijab', 'unterschicht', 'oberteil', 'kleid', 'unterteil', 'unterteilDrunter', 'schuhe']
const SIDE_ORDER: Slot[] = ['jacke', 'kette', 'armband', 'ring', 'guertel']

const slotIcon: Record<Slot, IconName> = {
  unterschicht: 'drunter',
  oberteil: 'oberteil',
  kleid: 'kleid',
  unterteil: 'unterteil',
  unterteilDrunter: 'leggings',
  jacke: 'jacke',
  schuhe: 'schuhe',
  hijab: 'hijab',
  ring: 'ring',
  armband: 'armband',
  kette: 'kette',
  guertel: 'guertel',
}

interface Props {
  parts: OutfitParts
  items: Item[]
  settings: Settings
  onReroll?: (s: Slot) => void
  onToggle?: (s: Slot) => void
}

export function OutfitView({ parts, items, settings, onReroll, onToggle }: Props) {
  const by = new Map(items.map((i) => [i.id, i]))
  const has = (c: Item['category']) => items.some((i) => i.category === c)
  const bottom = parts.unterteil ? by.get(parts.unterteil) : undefined

  const required = (s: Slot) => (s === 'oberteil' && !parts.kleid) || s === 'kleid' || (s === 'unterteil' && !parts.kleid)

  const addable: Slot[] = []
  if (!parts.jacke && has('jacke')) addable.push('jacke')
  if (!parts.unterschicht && items.some((i) => i.category === 'oberteil' && i.layer !== 'drueber' && i.id !== parts.oberteil))
    addable.push('unterschicht')
  if (parts.kleid && !parts.unterteil && has('unterteil')) addable.push('unterteil')
  if (
    !parts.kleid &&
    bottom?.bottomType === 'rock' &&
    !parts.unterteilDrunter &&
    items.some((i) => i.bottomType === 'leggings' || (i.bottomType === 'hose' && i.id !== bottom.id))
  )
    addable.push('unterteilDrunter')
  if (!parts.schuhe && has('schuhe')) addable.push('schuhe')
  if (settings.hijab && !parts.hijab && has('hijab')) addable.push('hijab')
  for (const s of ['kette', 'armband', 'ring', 'guertel'] as Slot[]) if (!parts[s] && has(s as Item['category'])) addable.push(s)

  const piece = (s: Slot, i: number, side = false) => {
    const id = parts[s]
    if (!id) return null
    const item = by.get(id)
    return (
      <figure key={`${s}-${id}`} className={`piece ${side ? 'side' : ''} slot-${s}`} style={{ '--i': i } as React.CSSProperties}>
        <ItemImage item={item} className="piece-img" />
        <figcaption>
          <span className="piece-slot">{slotLabels[s]}</span>
          {item?.name && !side && <span className="piece-name">{item.name}</span>}
        </figcaption>
        {(onReroll || onToggle) && (
          <div className="piece-actions">
            {onReroll && (
              <button className="glass-btn" onClick={() => onReroll(s)} aria-label={`${slotLabels[s]} tauschen`}>
                <Icon name="refresh" size={side ? 14 : 16} />
              </button>
            )}
            {onToggle && !required(s) && (
              <button className="glass-btn" onClick={() => onToggle(s)} aria-label={`${slotLabels[s]} weglassen`}>
                <Icon name="x" size={side ? 14 : 16} />
              </button>
            )}
          </div>
        )}
      </figure>
    )
  }

  const main = MAIN_ORDER.filter((s) => parts[s])
  const side = SIDE_ORDER.filter((s) => parts[s])

  return (
    <div className="look" key={outfitKey(parts)}>
      <div className={`look-stage ${side.length ? '' : 'solo'}`}>
        <div className="look-main">{main.map((s, i) => piece(s, i))}</div>
        {side.length > 0 && <div className="look-side">{side.map((s, i) => piece(s, main.length + i, true))}</div>}
      </div>
      {onToggle && addable.length > 0 && (
        <div className="addables">
          <span className="eyebrow">Dazu nehmen</span>
          <div className="chips wrap">
            {addable.map((s) => (
              <button key={s} className="chip small ghost-chip" onClick={() => onToggle(s)}>
                <Icon name="plus" size={14} />
                <Icon name={slotIcon[s]} size={16} />
                {slotLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Kleine Collage für die Look-Liste */
export function OutfitThumb({ parts, items }: { parts: OutfitParts; items: Item[] }) {
  const by = new Map(items.map((i) => [i.id, i]))
  const order: Slot[] = ['hijab', 'unterschicht', 'oberteil', 'kleid', 'unterteil', 'jacke', 'schuhe']
  const list = order.map((s) => parts[s] && by.get(parts[s]!)).filter(Boolean) as Item[]
  return (
    <div className={`thumb n${Math.min(list.length, 6)}`}>
      {list.slice(0, 6).map((i) => (
        <ItemImage key={i.id} item={i} />
      ))}
    </div>
  )
}
