import { useRef, useState } from 'react'
import { exportAll, importAll, wipeAll } from '../db'
import { LocationPicker } from '../components/LocationPicker'
import { useStore } from '../store'
import { emptyPrefs, type LayeringFreq, type Settings, type ShortRule } from '../types'

const shortOptions: { v: ShortRule; t: string; d: string }[] = [
  { v: 'immer', t: 'Immer mit Unterteil', d: 'Unter kurze Kleider/Röcke kommt immer eine Hose, ein Rock oder Leggings.' },
  { v: 'wetter', t: 'Je nach Wetter', d: 'Bei Wärme (ab 18°) auch ohne – bei Kälte mit etwas drunter.' },
  { v: 'ohne', t: 'Auch ohne', d: 'Kurz ist okay. Nur bei richtiger Kälte (unter 10°) kommt etwas drunter.' },
]
const layerOptions: { v: LayeringFreq; t: string }[] = [
  { v: 'nie', t: 'Nie' },
  { v: 'manchmal', t: 'Manchmal' },
  { v: 'oft', t: 'Oft' },
]

export function SettingsPage() {
  const { settings, setSettings, reload, setPrefs, items } = useStore()
  const [editLoc, setEditLoc] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Settings>) => setSettings({ ...settings, ...p })

  async function doExport() {
    const blob = await exportAll()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kleiderschrank-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h2>Einstellungen</h2>
      </header>

      <section className="card">
        <h3>🧕 Hijab</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.hijab} onChange={(e) => set({ hijab: e.target.checked })} />
          <span>Hijab in Outfits vorschlagen</span>
        </label>
      </section>

      <section className="card">
        <h3>👗 Kurze Kleider & Röcke</h3>
        {shortOptions.map((o) => (
          <label key={o.v} className="radio">
            <input type="radio" name="short" checked={settings.shortRule === o.v} onChange={() => set({ shortRule: o.v })} />
            <span>
              <b>{o.t}</b>
              <small className="muted">{o.d}</small>
            </span>
          </label>
        ))}
        <p className="muted small">Die App lernt zusätzlich aus deinen 👍/👎, was dir lieber ist.</p>
      </section>

      <section className="card">
        <h3>🧅 Layering (mehrere Schichten)</h3>
        <p className="muted small">z. B. Hemd unter Pulli, Langarmshirt unter Kleid, Hose unter kurzem Kleid</p>
        <div className="seg">
          {layerOptions.map((o) => (
            <button key={o.v} className={settings.layering === o.v ? 'on' : ''} onClick={() => set({ layering: o.v })}>
              {o.t}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>💍 Schmuck</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.jewelry} onChange={(e) => set({ jewelry: e.target.checked })} />
          <span>Schmuck & Gürtel vorschlagen</span>
        </label>
      </section>

      <section className="card">
        <h3>🌦️ Wetter</h3>
        <div className="field">
          <span>Ort</span>
          {settings.location && !editLoc ? (
            <div className="row gap">
              <b className="grow">{settings.location.name}</b>
              <button className="btn small" onClick={() => setEditLoc(true)}>Ändern</button>
            </div>
          ) : (
            <LocationPicker onDone={() => setEditLoc(false)} />
          )}
        </div>
        <div className="field">
          <span>Ich bin unterwegs von – bis</span>
          <div className="row gap">
            <select value={settings.dayStart} onChange={(e) => set({ dayStart: +e.target.value })}>
              {Array.from({ length: 24 }, (_, h) => h).filter((h) => h < settings.dayEnd).map((h) => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
            <span>bis</span>
            <select value={settings.dayEnd} onChange={(e) => set({ dayEnd: +e.target.value })}>
              {Array.from({ length: 24 }, (_, h) => h).filter((h) => h > settings.dayStart).map((h) => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
          </div>
          <small className="muted">Das Outfit passt für die kälteste und die wärmste Stunde in diesem Zeitraum.</small>
        </div>
      </section>

      <section className="card">
        <h3>💾 Daten</h3>
        <p className="muted small">
          Alles ({items.length} Teile) ist nur auf diesem Gerät gespeichert. Mach ab und zu eine Sicherung – z. B. bevor du das Handy wechselst.
        </p>
        <div className="col gap">
          <button className="btn" onClick={doExport}>⬇️ Sicherung herunterladen</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆️ Sicherung laden</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              if (!confirm('Die Sicherung ersetzt deinen aktuellen Schrank. Fortfahren?')) return
              try {
                await importAll(f)
                await reload()
                alert('Sicherung geladen ✅')
              } catch (err) {
                alert((err as Error).message)
              }
              e.target.value = ''
            }}
          />
          <button
            className="btn"
            onClick={async () => {
              if (confirm('Gelernten Stil zurücksetzen? Deine Sachen und Outfits bleiben.')) await setPrefs(emptyPrefs())
            }}
          >
            🔁 Gelernten Stil zurücksetzen
          </button>
          <button
            className="btn danger"
            onClick={async () => {
              if (confirm('Wirklich ALLES löschen? Das kann man nicht rückgängig machen.')) {
                await wipeAll()
                await reload()
              }
            }}
          >
            🗑️ Alles löschen
          </button>
        </div>
      </section>

      <section className="card">
        <h3>📲 Mit Freundinnen teilen</h3>
        <p className="muted small">
          Schick einfach den Link zu dieser Seite. Jede hat ihren eigenen Schrank – niemand sieht die Sachen der anderen.
          Zum Installieren: im Browser-Menü <b>„Zum Home-Bildschirm“</b> wählen.
        </p>
        {navigator.share && (
          <button className="btn" onClick={() => navigator.share({ title: 'Digitaler Kleiderschrank', url: location.href.split('#')[0] })}>
            🔗 Link teilen
          </button>
        )}
        <p className="muted small">Wetterdaten: Open-Meteo.com</p>
      </section>
    </div>
  )
}
