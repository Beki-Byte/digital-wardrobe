import { useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { categoryLabels } from '../labels'

export function AddItem({ goWardrobe }: { goWardrobe: () => void }) {
  const [key, setKey] = useState(0)
  const [last, setLast] = useState('')
  return (
    <div className="page">
      <header className="page-head">
        <h2>Teil scannen</h2>
      </header>
      {last && (
        <div className="card success">
          ✅ {last} gespeichert.
          <button className="btn ghost small" onClick={goWardrobe}>Zum Schrank →</button>
        </div>
      )}
      <ItemForm
        key={key}
        onDone={(i) => {
          if (i) setLast(i.name || categoryLabels[i.category])
          setKey((k) => k + 1)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </div>
  )
}
