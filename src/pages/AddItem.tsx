import { useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { categoryLabels } from '../labels'
import { Icon } from '../components/Icon'

export function AddItem({ goWardrobe }: { goWardrobe: () => void }) {
  const [key, setKey] = useState(0)
  const [last, setLast] = useState('')
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Neues Teil</p>
          <h1 className="display">Scannen</h1>
        </div>
      </header>
      {last && (
        <div className="card success">
          <span><Icon name="check" size={18} /> {last} ist im Schrank.</span>
          <button className="btn ghost small" onClick={goWardrobe}>Ansehen <Icon name="arrow" size={16} /></button>
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
