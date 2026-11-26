import { useState } from 'react'
import { uid } from '../db'
import { isAllowed, learn } from '../engine'
import { ItemImage } from '../components/ItemImage'
import { OutfitThumb, OutfitView } from '../components/OutfitView'
import { slotCategory, slotLabels } from '../labels'
import { Icon } from '../components/Icon'
import { useStore } from '../store'
import type { Outfit, OutfitParts, Slot, Template } from '../types'

const fmt = (t: number) => new Date(t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

export function Outfits() {
  const { outfits, items, settings, saveOutfit, removeOutfit, prefs, setPrefs, saveItem } = useStore()
  const [tab, setTab] = useState<'saved' | 'history'>('saved')
  const [open, setOpen] = useState<Outfit | null>(null)
  const [building, setBuilding] = useState(false)

  if (building) return <Builder onClose={() => setBuilding(false)} />

  if (open)
    return (
      <div className="page">
        <header className="page-head">
          <button className="btn ghost" onClick={() => setOpen(null)}><Icon name="back" size={18} /> Looks</button>
        </header>
        <section className="look-card">
          {open.name && <h2 className="look-title">{open.name}</h2>}
          <OutfitView parts={open.parts} items={items} settings={settings} />
          {open.wornDates.length > 0 && (
            <p className="muted small">Getragen: {open.wornDates.slice(-5).map(fmt).join(', ')}</p>
          )}
          <div className="actions">
            <button
              className="btn primary"
              onClick={async () => {
                const now = Date.now()
                const o = { ...open, wornDates: [...open.wornDates, now] }
                await saveOutfit(o)
                for (const id of new Set(Object.values(open.parts))) {
                  const it = items.find((i) => i.id === id)
                  if (it) await saveItem({ ...it, lastWorn: now, wornCount: it.wornCount + 1 })
                }
                await setPrefs(learn(prefs, open, items, 1))
                setOpen(o)
              }}
            >
              <Icon name="check" size={18} /> Heute anziehen
            </button>
            {open.saved ? (
              <button className="btn" onClick={async () => { await saveOutfit({ ...open, saved: false }); setOpen(null) }}>
                <Icon name="heartFill" size={18} /> Gespeichert
              </button>
            ) : (
              <button className="btn" onClick={async () => { const o = { ...open, saved: true }; await saveOutfit(o); setOpen(o) }}>
                <Icon name="heart" size={18} /> Speichern
              </button>
            )}
            <button className="btn round danger" aria-label="Look löschen" onClick={async () => { if (confirm('Outfit löschen?')) { await removeOutfit(open.id); setOpen(null) } }}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        </section>
      </div>
    )

  const list =
    tab === 'saved'
      ? outfits.filter((o) => o.saved)
      : outfits.filter((o) => o.wornDates.length).sort((a, b) => Math.max(...b.wornDates) - Math.max(...a.wornDates))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Deine Sammlung</p>
          <h1 className="display">Looks</h1>
        </div>
        <button className="btn small" onClick={() => setBuilding(true)}><Icon name="plus" size={16} /> Selbst</button>
      </header>
      <div className="seg">
        <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>Gespeichert</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Getragen</button>
      </div>
      {list.length === 0 ? (
        <section className="card empty">
          <p className="muted">
            {tab === 'saved' ? 'Noch keine gespeicherten Looks. Tippe bei einem Vorschlag auf das Herz.' : 'Hier erscheinen Looks, die du angezogen hast.'}
          </p>
        </section>
      ) : (
        <div className="grid outfits-grid">
          {list.map((o) => (
            <button key={o.id} className="grid-item" onClick={() => setOpen(o)}>
              <OutfitThumb parts={o.parts} items={items} />
              <span className="grid-label">
                {o.name || (o.wornDates.length ? `${o.wornDates.length}× getragen` : fmt(o.createdAt))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Outfit selbst zusammenstellen ---------- */

const BUILD_SLOTS: Slot[] = ['hijab', 'unterschicht', 'oberteil', 'kleid', 'unterteil', 'unterteilDrunter', 'jacke', 'schuhe', 'kette', 'armband', 'ring', 'guertel']

function Builder({ onClose }: { onClose: () => void }) {
  const { items, settings, saveOutfit, prefs, setPrefs } = useStore()
  const [parts, setParts] = useState<OutfitParts>({})
  const [name, setName] = useState('')
  const by = new Map(items.map((i) => [i.id, i]))

  const slots = BUILD_SLOTS.filter((s) => {
    if (s === 'hijab' && !settings.hijab) return false
    if (s === 'unterteilDrunter' && !parts.unterteil) return false
    return items.some((i) => i.category === slotCategory[s])
  })

  const template: Template = parts.kleid ? (parts.unterschicht ? 'kleidLayering' : 'kleid') : parts.unterschicht ? 'layering' : 'einfach'
  const valid = (parts.kleid || (parts.oberteil && parts.unterteil)) && isAllowed(parts, by, { ...settings, shortRule: 'ohne' })

  return (
    <div className="page">
      <header className="page-head">
        <button className="btn ghost" onClick={onClose}><Icon name="back" size={18} /> Looks</button>
      </header>
      <header className="page-head">
        <h1 className="display">Eigener <em>Look</em></h1>
      </header>
      <p className="muted">Wähle für jede Schicht ein Teil – oder lass sie leer.</p>
      {slots.map((s) => {
        const opts = items.filter((i) => i.category === slotCategory[s] && (!Object.values(parts).includes(i.id) || parts[s] === i.id))
        return (
          <div key={s} className="field">
            <span>{slotLabels[s]}</span>
            <div className="picker">
              <button className={`pick none ${!parts[s] ? 'on' : ''}`} onClick={() => setParts((p) => { const n = { ...p }; delete n[s]; return n })}>
                –
              </button>
              {opts.map((i) => (
                <button key={i.id} className={`pick ${parts[s] === i.id ? 'on' : ''}`} onClick={() => setParts((p) => ({ ...p, [s]: i.id }))}>
                  <ItemImage item={i} />
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <label className="field">
        <span>Name (optional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Freitag-Look" />
      </label>
      <div className="sticky-actions">
        <button
          className="btn primary grow"
          disabled={!valid}
          onClick={async () => {
            await saveOutfit({ id: uid(), parts, template, name: name.trim() || undefined, createdAt: Date.now(), saved: true, wornDates: [] })
            // selbst gebaute Outfits zählen stark für den Stil
            await setPrefs(learn(prefs, { parts, template }, items, 2))
            onClose()
          }}
        >
          <Icon name="heart" size={18} /> Look speichern
        </button>
      </div>
      {!valid && <p className="muted small">Mindestens Oberteil + Unterteil oder ein Kleid auswählen.</p>}
    </div>
  )
}
