import { useState } from 'react'
import { useStore } from '../store'
import { currentPosition, searchCity } from '../weather'
import { Icon } from './Icon'

export function LocationPicker({ onDone }: { onDone?: () => void }) {
  const { settings, setSettings } = useStore()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ lat: number; lon: number; name: string }[]>([])
  const [msg, setMsg] = useState('')

  async function gps() {
    setMsg('Standort wird gesucht …')
    try {
      const p = await currentPosition()
      await setSettings({ ...settings, location: { ...p, name: 'Mein Standort' } })
      setMsg('')
      onDone?.()
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setMsg('Suche …')
    try {
      const r = await searchCity(q.trim())
      setRes(r)
      setMsg(r.length ? '' : 'Nichts gefunden')
    } catch {
      setMsg('Suche fehlgeschlagen – bist du online?')
    }
  }

  return (
    <div className="location">
      <button className="btn" onClick={gps}>
        <Icon name="pin" size={18} /> Meinen Standort nutzen
      </button>
      <form onSubmit={search} className="search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="oder Stadt eingeben" aria-label="Stadt" />
        <button className="btn icon-only" type="submit" aria-label="Suchen">
          <Icon name="arrow" size={18} />
        </button>
      </form>
      {msg && <p className="muted small">{msg}</p>}
      {res.map((r) => (
        <button
          key={`${r.lat},${r.lon}`}
          className="list-btn"
          onClick={async () => {
            await setSettings({ ...settings, location: r })
            setRes([])
            setQ('')
            onDone?.()
          }}
        >
          <Icon name="pin" size={16} /> {r.name}
        </button>
      ))}
    </div>
  )
}
