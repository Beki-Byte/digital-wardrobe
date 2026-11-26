import { useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { ItemImage } from '../components/ItemImage'
import { categoryLabels } from '../labels'
import { Icon } from '../components/Icon'
import { useStore } from '../store'
import type { Category, Item } from '../types'

export function Wardrobe({ goAdd }: { goAdd: () => void }) {
  const { items, settings } = useStore()
  const [filter, setFilter] = useState<Category | 'alle'>('alle')
  const [edit, setEdit] = useState<Item | null>(null)

  if (edit)
    return (
      <div className="page">
        <header className="page-head">
          <button className="btn ghost" onClick={() => setEdit(null)}><Icon name="back" size={18} /> Schrank</button>
        </header>
        <ItemForm existing={edit} onDone={() => setEdit(null)} />
      </div>
    )

  const cats = (Object.keys(categoryLabels) as Category[]).filter(
    (c) => items.some((i) => i.category === c) && (c !== 'hijab' || settings.hijab),
  )
  const shown = items.filter((i) => (filter === 'alle' ? i.category !== 'hijab' || settings.hijab : i.category === filter))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{items.length} {items.length === 1 ? 'Teil' : 'Teile'}</p>
          <h1 className="display">Mein <em>Schrank</em></h1>
        </div>
      </header>
      {cats.length > 1 && (
        <div className="chips scroll">
          <button className={`chip ${filter === 'alle' ? 'on' : ''}`} onClick={() => setFilter('alle')}>Alle</button>
          {cats.map((c) => (
            <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
              <Icon name={c} size={16} /> {categoryLabels[c]}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <section className="card empty">
          <div className="empty-art"><Icon name="wardrobe" size={44} stroke={1.2} /></div>
          <p className="muted">Noch nichts hier.</p>
          <button className="btn primary" onClick={goAdd}><Icon name="camera" size={18} /> Teil scannen</button>
        </section>
      ) : (
        <div className="grid">
          {shown.map((i) => (
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
