import { useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { ItemImage } from '../components/ItemImage'
import { categoryIcons, categoryLabels } from '../labels'
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
          <button className="btn ghost" onClick={() => setEdit(null)}>← Zurück</button>
          <h2>Bearbeiten</h2>
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
        <h2>Mein Schrank</h2>
        <span className="muted">{items.length} Teile</span>
      </header>
      {cats.length > 1 && (
        <div className="chips scroll">
          <button className={`chip ${filter === 'alle' ? 'on' : ''}`} onClick={() => setFilter('alle')}>Alle</button>
          {cats.map((c) => (
            <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
              {categoryIcons[c]} {categoryLabels[c]}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <section className="card empty">
          <div className="big-icon">🧺</div>
          <p className="muted">Noch nichts hier.</p>
          <button className="btn primary" onClick={goAdd}>📸 Teil hinzufügen</button>
        </section>
      ) : (
        <div className="grid">
          {shown.map((i) => (
            <button key={i.id} className="grid-item" onClick={() => setEdit(i)}>
              <ItemImage item={i} className="checker" />
              <span className="grid-label">
                <span className="dot" style={{ background: i.color }} />
                {i.name || categoryLabels[i.category]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
