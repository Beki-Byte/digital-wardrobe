import { useState } from 'react'
import { useStore } from '../store'
import { currentPosition, searchCity } from '../weather'

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
      <button className="btn" onClick={gps}>📍 Meinen Standort nutzen</button>
      <form onSubmit={search} className="row gap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="oder Stadt eingeben …" className="grow" />
        <button className="btn" type="submit">Suchen</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
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
          {r.name}
        </button>
      ))}
    </div>
  )
}
