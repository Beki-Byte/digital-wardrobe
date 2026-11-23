import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMeta, setMeta, uid } from '../db'
import {
  availableTemplates,
  learn,
  learnReject,
  outfitKey,
  pools,
  rerollSlot,
  suggest,
  toggleSlot,
  weatherTips,
  type Scored,
} from '../engine'
import { weatherText } from '../labels'
import { useStore } from '../store'
import type { DayWeather, Outfit, Slot } from '../types'
import { fetchWeather } from '../weather'
import { LocationPicker } from '../components/LocationPicker'
import { OutfitView } from '../components/OutfitView'

const dateKey = (offset: number) => {
  const d = new Date(Date.now() + offset * 86400000)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface SavedSuggestion {
  date: string
  s: Scored
}

export function Today({ goAdd }: { goAdd: () => void }) {
  const { items, settings, prefs, setPrefs, saveItem, saveOutfit, outfits } = useStore()
  const [offset, setOffset] = useState(() => (new Date().getHours() >= 18 ? 1 : 0))
  // Wetter gehört immer zu einem bestimmten Tag (Heute/Morgen)
  const [wState, setWState] = useState<{ key: string; w?: DayWeather; err?: string }>({ key: '' })
  const [current, setCurrent] = useState<Scored | null>(null)
  const [toast, setToast] = useState('')
  const avoid = useRef(new Set<string>())

  const loc = settings.location
  const wKey = loc ? `weather:${loc.lat},${loc.lon}:${settings.dayStart}-${settings.dayEnd}:${dateKey(offset)}` : ''
  const weather = wState.key === wKey ? wState.w : undefined
  const wErr = wState.key === wKey ? (wState.err ?? '') : ''
  const canSuggest = useMemo(() => availableTemplates(pools(items), settings).length > 0, [items, settings])

  /* Wetter laden */
  useEffect(() => {
    if (!loc) return
    let stop = false
    const key = wKey
    ;(async () => {
      const cached = await getMeta<{ at: number; w: DayWeather }>(key)
      if (cached && Date.now() - cached.at < 3600000) {
        if (!stop) setWState({ key, w: cached.w })
        return
      }
      try {
        const w = await fetchWeather(loc.lat, loc.lon, settings.dayStart, settings.dayEnd, offset)
        await setMeta(key, { at: Date.now(), w })
        if (!stop) setWState({ key, w })
      } catch (e) {
        if (!stop) setWState(cached ? { key, w: cached.w } : { key, err: (e as Error).message })
      }
    })()
    return () => {
      stop = true
    }
  }, [loc, offset, wKey, settings.dayStart, settings.dayEnd])

  const newSuggestion = useCallback(
    (persist = true) => {
      const s = suggest(items, prefs, settings, weather, avoid.current)
      setCurrent(s)
      if (s) {
        avoid.current.add(outfitKey(s.parts))
        if (persist) setMeta(`today:${offset}`, { date: dateKey(offset), s } satisfies SavedSuggestion)
      }
    },
    [items, prefs, settings, weather, offset],
  )

  /* Vorschlag des Tages: bleibt gleich, bis du ihn änderst */
  const loadedFor = useRef('')
  useEffect(() => {
    if (!canSuggest) return
    if (loc && !weather && !wErr) return // erst Wetter abwarten
    const k = `${offset}:${weather ? wKey : 'n'}`
    if (loadedFor.current === k) return
    loadedFor.current = k
    ;(async () => {
      const saved = await getMeta<SavedSuggestion>(`today:${offset}`)
      const by = new Set(items.map((i) => i.id))
      if (saved && saved.date === dateKey(offset) && Object.values(saved.s.parts).every((id) => by.has(id!))) {
        setCurrent(saved.s)
      } else newSuggestion()
    })()
  }, [canSuggest, loc, weather, wErr, wKey, offset, items, newSuggestion])

  const update = (s: Scored) => {
    setCurrent(s)
    setMeta(`today:${offset}`, { date: dateKey(offset), s } satisfies SavedSuggestion)
  }

  const flash = (t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 2200)
  }

  async function dislike() {
    if (!current) return
    await setPrefs(learn(prefs, current, items, -0.7))
    newSuggestion()
  }

  function findSaved(s: Scored): Outfit | undefined {
    const k = outfitKey(s.parts)
    return outfits.find((o) => outfitKey(o.parts) === k)
  }

  async function saveFav() {
    if (!current) return
    const ex = findSaved(current)
    if (ex?.saved) return flash('Schon gespeichert ❤️')
    await saveOutfit(ex ? { ...ex, saved: true } : { id: uid(), parts: current.parts, template: current.template, createdAt: Date.now(), saved: true, wornDates: [] })
    await setPrefs(learn(prefs, current, items, 1.5))
    flash('Gespeichert ❤️ – die App merkt sich deinen Stil')
  }

  async function wear() {
    if (!current) return
    const when = offset === 0 ? Date.now() : Date.now() + 86400000
    const ex = findSaved(current)
    await saveOutfit(
      ex
        ? { ...ex, wornDates: [...ex.wornDates, when] }
        : { id: uid(), parts: current.parts, template: current.template, createdAt: Date.now(), saved: false, wornDates: [when] },
    )
    for (const id of new Set(Object.values(current.parts))) {
      const it = items.find((i) => i.id === id)
      if (it) await saveItem({ ...it, lastWorn: when, wornCount: it.wornCount + 1 })
    }
    await setPrefs(learn(prefs, current, items, 1))
    flash(offset === 0 ? 'Viel Spaß heute! ✨' : 'Für morgen eingeplant ✨')
  }

  async function reroll(slot: Slot) {
    if (!current) return
    const old = current.parts[slot]
    update(rerollSlot(current, slot, items, prefs, settings, weather))
    if (old) await setPrefs(learnReject(prefs, old))
  }

  function toggle(slot: Slot) {
    if (!current) return
    const next = toggleSlot(current, slot, items, prefs, settings, weather)
    if (next === current && current.parts[slot]) flash('Bei dem Wetter geht das kurze Teil nicht ohne was drunter')
    update(next)
  }

  const wt = weather ? weatherText(weather.code) : null
  const tips = weather && current ? weatherTips(current.parts, items, weather) : []

  return (
    <div className="page">
      <header className="page-head">
        <div className="seg">
          <button className={offset === 0 ? 'on' : ''} onClick={() => setOffset(0)}>Heute</button>
          <button className={offset === 1 ? 'on' : ''} onClick={() => setOffset(1)}>Morgen</button>
        </div>
      </header>

      {/* Wetter */}
      {!loc ? (
        <section className="card">
          <h3>🌦️ Wo bist du?</h3>
          <p className="muted">Damit die Outfits zum Wetter passen. Der Ort bleibt auf deinem Gerät.</p>
          <LocationPicker />
        </section>
      ) : weather ? (
        <section className="card weather">
          <div className="w-main">
            <span className="w-icon">{wt!.icon}</span>
            <div>
              <div className="w-range">
                <span className="cold">{weather.min}°</span>
                <span className="arrow">→</span>
                <span className="warm">{weather.max}°</span>
              </div>
              <div className="muted small">
                {wt!.text} · {settings.dayStart}–{settings.dayEnd} Uhr · {loc.name}
                {weather.rainProb >= 30 && ` · ☔ ${weather.rainProb} %`}
              </div>
            </div>
          </div>
          <TempBar w={weather} />
        </section>
      ) : wErr ? (
        <section className="card"><p className="muted">⚠️ {wErr}. Vorschläge kommen trotzdem – nur ohne Wetter.</p></section>
      ) : (
        <section className="card"><p className="muted">Wetter wird geladen …</p></section>
      )}

      {/* Outfit */}
      {!canSuggest ? (
        <section className="card empty">
          <div className="big-icon">👗</div>
          <h3>Dein Schrank ist noch leer</h3>
          <p className="muted">
            Scanne mindestens <b>ein Oberteil und ein Unterteil</b> oder <b>ein Kleid</b> – dann bekommst du dein erstes Outfit.
            Je mehr Sachen, desto besser die Vorschläge.
          </p>
          <button className="btn primary" onClick={goAdd}>📸 Erstes Teil scannen</button>
        </section>
      ) : current ? (
        <section className="card">
          <OutfitView parts={current.parts} items={items} settings={settings} onReroll={reroll} onToggle={toggle} />
          {tips.length > 0 && (
            <ul className="tips">
              {tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
          <div className="actions">
            <button className="btn" onClick={dislike} title="Gefällt mir nicht – neues Outfit">👎 Anderes</button>
            <button className="btn" onClick={saveFav}>❤️ Speichern</button>
            <button className="btn primary" onClick={wear}>✅ {offset === 0 ? 'Anziehen' : 'Einplanen'}</button>
          </div>
        </section>
      ) : (
        <section className="card"><p className="muted">Kein passendes Outfit gefunden. Füge mehr Sachen hinzu oder ändere die Einstellungen.</p></section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function TempBar({ w }: { w: DayWeather }) {
  const lo = Math.min(...w.hours.map((h) => h.temp)), hi = Math.max(...w.hours.map((h) => h.temp))
  const span = Math.max(1, hi - lo)
  return (
    <div className="tempbar" aria-label="Temperatur im Tagesverlauf">
      {w.hours.map((h) => (
        <div key={h.hour} className="tb-col">
          <div className="tb-val">{h.temp}°</div>
          <div className="tb-bar" style={{ height: `${18 + ((h.temp - lo) / span) * 42}px`, background: tempColor(h.temp) }} />
          <div className="tb-hour">{h.hour}</div>
        </div>
      ))}
    </div>
  )
}

const tempColor = (t: number) =>
  t <= 0 ? '#6aa5e0' : t <= 8 ? '#8cc0d8' : t <= 15 ? '#9fcfa8' : t <= 22 ? '#f2c96b' : '#f0935f'
