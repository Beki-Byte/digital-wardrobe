import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ItemForm } from '../components/ItemForm'
import { ItemImage } from '../components/ItemImage'
import { Icon } from '../components/Icon'
import { categoryLabels, warmthLabels } from '../labels'
import { tier } from '../lib/quality'
import { useStore } from '../store'
import type { Category, Item } from '../types'
import type { WardrobeState } from '../webgl/WardrobeScene'

const WardrobeCanvas = lazy(() => import('../webgl/WardrobeScene'))

const VIEW_KEY = 'kleiderschrank:ansicht'
const JEWELRY: Category[] = ['ring', 'armband', 'kette', 'guertel']

export function Wardrobe({ goAdd, goToday }: { goAdd: () => void; goToday: () => void }) {
  const { items, settings } = useStore()
  const [filter, setFilter] = useState<Category | 'alle'>('alle')
  const [edit, setEdit] = useState<Item | null>(null)
  const [view, setView] = useState<'3d' | 'raster'>(() => {
    if (tier === 'low') return 'raster'
    try {
      return (localStorage.getItem(VIEW_KEY) as '3d' | 'raster') || '3d'
    } catch {
      return '3d'
    }
  })
  const switchView = (v: '3d' | 'raster') => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* egal */
    }
  }

  const visible = useMemo(
    () => items.filter((i) => (filter === 'alle' ? i.category !== 'hijab' || settings.hijab : i.category === filter)),
    [items, filter, settings.hijab],
  )
  const canSuggest = items.some((i) => i.category === 'kleid') || (items.some((i) => i.category === 'oberteil') && items.some((i) => i.category === 'unterteil'))
  const cats = (Object.keys(categoryLabels) as Category[]).filter(
    (c) => items.some((i) => i.category === c) && (c !== 'hijab' || settings.hijab),
  )

  if (edit)
    return (
      <div className="page">
        <header className="page-head">
          <button className="btn ghost" onClick={() => setEdit(null)}>
            <Icon name="back" size={18} /> Schrank
          </button>
        </header>
        <ItemForm existing={edit} onDone={() => setEdit(null)} />
      </div>
    )

  const filters =
    cats.length > 1 ? (
      <div className="chips scroll">
        <button className={`chip ${filter === 'alle' ? 'on' : ''}`} onClick={() => setFilter('alle')}>Alle</button>
        {cats.map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
            <Icon name={c} size={16} /> {categoryLabels[c]}
          </button>
        ))}
      </div>
    ) : null

  const toggle =
    tier !== 'low' ? (
      <div className="seg compact" aria-label="Ansicht">
        <button className={view === '3d' ? 'on' : ''} onClick={() => switchView('3d')}>Schrank</button>
        <button className={view === 'raster' ? 'on' : ''} onClick={() => switchView('raster')}>Raster</button>
      </div>
    ) : null

  if (view === '3d')
    return <Wardrobe3D items={visible} total={items.length} filters={filters} toggle={toggle} onEdit={setEdit} goAdd={goAdd} goToday={goToday} canSuggest={canSuggest} />

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{items.length} {items.length === 1 ? 'Teil' : 'Teile'}</p>
          <h1 className="display">Mein Schrank</h1>
        </div>
        {toggle}
      </header>
      {filters}
      {visible.length === 0 ? (
        <section className="card empty">
          <div className="empty-art"><Icon name="wardrobe" size={44} stroke={1.2} /></div>
          <p className="muted">Noch nichts hier.</p>
          <button className="btn primary" onClick={goAdd}><Icon name="camera" size={18} /> Teil scannen</button>
        </section>
      ) : (
        <div className="grid">
          {visible.map((i) => (
            <button key={i.id} className="grid-item" onClick={() => setEdit(i)}>
              <span className="grid-img"><ItemImage item={i} /></span>
              <span className="grid-label">
                <span className="dot" style={{ background: i.color }} />
                <span className="ellipsis">{i.name || categoryLabels[i.category]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 3D-Ansicht ---------- */

function Wardrobe3D({
  items, total, filters, toggle, onEdit, goAdd, goToday, canSuggest,
}: {
  items: Item[]
  total: number
  filters: React.ReactNode
  toggle: React.ReactNode
  onEdit: (i: Item) => void
  goAdd: () => void
  goToday: () => void
  canSuggest: boolean
}) {
  const st = useMemo<WardrobeState>(() => ({ left: 0, right: 0, light: 0, scroll: 0, target: 0, max: 0 }), [])
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const dragged = useRef(false)
  const drag = useRef<{ x: number; t: number; start: number } | null>(null)

  // Filter gewechselt → zurück an den Anfang
  useEffect(() => {
    st.target = 0
  }, [items, st])

  const close = () => {
    setSelected(null)
    gsap.to(st, { left: 0, right: 0, duration: 0.8, ease: 'power2.in' })
  }

  // Bügel durchschieben (nur wenn offen und nicht gerade eine Tür gezogen wird)
  const onDown = (e: React.PointerEvent) => {
    setTouched(true)
    if (!open || dragged.current) return
    drag.current = { x: e.clientX, t: st.target, start: e.clientX }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(e.clientX - drag.current.start) > 8) dragged.current = true
    const k = 2.6 / Math.max(320, (e.currentTarget as HTMLElement).clientWidth)
    st.target = Math.min(st.max, Math.max(0, drag.current.t - dx * k))
  }
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    setTimeout(() => (dragged.current = false), 0)
  }
  const onWheel = (e: React.WheelEvent) => {
    if (open) st.target = Math.min(st.max, Math.max(0, st.target + (e.deltaX || e.deltaY) * 0.004))
  }

  return (
    <div className={`wardrobe3d ${open ? 'is-open' : ''}`}>
      <div className="stage3d" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <div className="stage-glow" />
        <Suspense fallback={<div className="stage-loading" />}>
          <WardrobeCanvas
            items={items}
            st={st}
            selected={selected?.id ?? null}
            onTap={(i) => setSelected((cur) => (i && cur?.id === i.id ? null : i))}
            dragged={dragged}
            onDoorsChange={(o) => {
              setOpen(o)
              if (!o) setSelected(null)
            }}
          />
        </Suspense>
      </div>

      <header className="w3d-head in">
        <div>
          <p className="eyebrow">{total} {total === 1 ? 'Teil' : 'Teile'}</p>
          <h1 className="display">Mein Schrank</h1>
        </div>
        {toggle}
      </header>
      <div className={`w3d-filters ${open ? 'in' : ''}`}>{filters}</div>

      {!open && <p className={`w3d-skip ${touched ? 'quiet' : ''}`}>Zieh die Türen auf – oder tipp sie an</p>}

      {open && total === 0 && (
        <div className="w3d-empty">
          <p>Noch leer hier drin.</p>
          <button className="btn primary" onClick={goAdd}><Icon name="camera" size={18} /> Erstes Teil scannen</button>
        </div>
      )}
      {open && total > 0 && !selected && (
        <div className="w3d-bottom">
          <p className="w3d-hint">{st.max > 0 ? 'Wischen zum Durchschieben, antippen für Details' : 'Teil antippen für Details'}</p>
          <div className="row gap">
            {canSuggest && (
              <button className="btn small primary w3d-today" onClick={goToday}><Icon name="sparkle" size={16} /> Mein Look für heute</button>
            )}
            <button className="btn small ghost-pill" onClick={close}>Schließen</button>
          </div>
        </div>
      )}

      {selected && (
        <div className="sheet" role="dialog" aria-label={selected.name || categoryLabels[selected.category]}>
          <div className="sheet-img"><ItemImage item={selected} /></div>
          <div className="sheet-body">
            <h2>{selected.name || categoryLabels[selected.category]}</h2>
            <p className="muted small">
              {categoryLabels[selected.category]}, {selected.colorName}
              {!JEWELRY.includes(selected.category) && `, ${warmthLabels[selected.warmth].toLowerCase()}`}
            </p>
            <p className="muted small">
              {selected.wornCount ? `${selected.wornCount}× getragen` : 'Noch nicht getragen'}
              {selected.lastWorn && `, zuletzt am ${new Date(selected.lastWorn).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`}
            </p>
            <div className="sheet-actions">
              <button className="btn primary grow" onClick={() => onEdit(selected)}><Icon name="wand" size={18} /> Bearbeiten</button>
              <button className="btn round" aria-label="Schließen" onClick={() => setSelected(null)}><Icon name="x" size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
