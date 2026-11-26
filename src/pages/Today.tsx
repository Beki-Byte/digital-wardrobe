import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Icon, weatherIcon } from '../components/Icon'
import { tier } from '../lib/quality'

const SkyCanvas = lazy(() => import('../webgl/SkyScene'))

const isRain = (c: number) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95
const isSnow = (c: number) => (c >= 71 && c <= 77) || c === 85 || c === 86

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
    if (ex?.saved) return flash('Schon gespeichert')
    await saveOutfit(ex ? { ...ex, saved: true } : { id: uid(), parts: current.parts, template: current.template, createdAt: Date.now(), saved: true, wornDates: [] })
    await setPrefs(learn(prefs, current, items, 1.5))
    flash('Gespeichert – die App merkt sich deinen Stil')
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
    flash(offset === 0 ? 'Viel Spaß heute!' : 'Für morgen eingeplant')
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

  const tips = weather && current ? weatherTips(current.parts, items, weather) : []
  const day = new Date(Date.now() + offset * 86400000).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' })

  const skyStyle = weather
    ? ({ '--sky-cold': `hsl(${210 - Math.max(-8, Math.min(30, weather.min)) * 4} 45% 45%)`, '--sky-warm': `hsl(${Math.max(8, 210 - Math.max(-8, Math.min(30, weather.max)) * 7)} 60% 50%)` } as React.CSSProperties)
    : undefined

  return (
    <div className="page today">
      <div className="sky-wrap" style={skyStyle} aria-hidden="true">
        {tier !== 'low' && weather && (
          <Suspense fallback={null}>
            <SkyCanvas
              min={weather.min}
              max={weather.max}
              rain={isRain(weather.code) || weather.rainProb >= 60 ? 1 : 0}
              snow={isSnow(weather.code) ? 1 : 0}
              cloud={weather.code >= 2 ? 0.9 : 0.35}
            />
          </Suspense>
        )}
      </div>
      <header className="hero-head">
        <div className="hero-top">
          <p className="eyebrow">{day}</p>
          <div className="seg compact" role="tablist">
            <button className={offset === 0 ? 'on' : ''} onClick={() => setOffset(0)}>Heute</button>
            <button className={offset === 1 ? 'on' : ''} onClick={() => setOffset(1)}>Morgen</button>
          </div>
        </div>
        <h1 className="display">
          Dein Look <em>{offset === 0 ? 'für heute' : 'für morgen'}</em>
        </h1>
      </header>

      {!loc ? (
        <section className="card">
          <h3>Wo bist du unterwegs?</h3>
          <p className="muted small">Damit dein Look zum Wetter passt – vom Morgen bis zum Nachmittag. Der Ort bleibt auf deinem Gerät.</p>
          <LocationPicker />
        </section>
      ) : weather ? (
        <section className="card weather">
          <div className="w-top">
            <div className="w-icon"><Icon name={weatherIcon(weather.code)} size={30} stroke={1.4} /></div>
            <div className="w-range">
              <span className="cold">{weather.min}°</span>
              <span className="w-dash" />
              <span className="warm">{weather.max}°</span>
            </div>
          </div>
          <p className="muted small w-meta">
            {weatherText(weather.code)} · {settings.dayStart}–{settings.dayEnd} Uhr · {loc.name}
            {weather.rainProb >= 30 && (
              <>
                {' · '}<Icon name="umbrella" size={13} /> {weather.rainProb} %
              </>
            )}
          </p>
          <TempCurve w={weather} />
        </section>
      ) : wErr ? (
        <section className="card"><p className="muted small">{wErr}. Vorschläge kommen trotzdem – nur ohne Wetter.</p></section>
      ) : (
        <section className="card weather skeleton" aria-label="Wetter wird geladen" />
      )}

      {!canSuggest ? (
        <section className="card empty">
          <div className="empty-art"><Icon name="wardrobe" size={44} stroke={1.2} /></div>
          <h3>Dein Schrank ist noch leer</h3>
          <p className="muted small">
            Scanne mindestens <b>ein Oberteil und ein Unterteil</b> oder <b>ein Kleid</b> – dann bekommst du deinen ersten Look.
            Je mehr Teile, desto besser die Vorschläge.
          </p>
          <button className="btn primary" onClick={goAdd}><Icon name="camera" size={18} /> Erstes Teil scannen</button>
        </section>
      ) : current ? (
        <section className="look-card">
          <OutfitView parts={current.parts} items={items} settings={settings} onReroll={reroll} onToggle={toggle} />
          {tips.length > 0 && (
            <ul className="tips">
              {tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
          <div className="actions">
            <button className="btn round" onClick={dislike} aria-label="Gefällt mir nicht – anderer Look"><Icon name="dislike" size={20} /></button>
            <button className="btn round" onClick={saveFav} aria-label="Look speichern"><Icon name="heart" size={20} /></button>
            <button className="btn primary grow" onClick={wear}><Icon name="check" size={18} /> {offset === 0 ? 'Anziehen' : 'Für morgen einplanen'}</button>
          </div>
        </section>
      ) : (
        <section className="card"><p className="muted small">Kein passender Look gefunden. Füge mehr Teile hinzu oder ändere die Einstellungen.</p></section>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

/** Temperaturkurve über den Tag */
function TempCurve({ w }: { w: DayWeather }) {
  const hs = w.hours
  const lo = Math.min(...hs.map((h) => h.temp)) - 1, hi = Math.max(...hs.map((h) => h.temp)) + 1
  const W = 320, H = 70, pad = 10
  const x = (i: number) => pad + (i / Math.max(1, hs.length - 1)) * (W - pad * 2)
  const y = (t: number) => H - 14 - ((t - lo) / Math.max(1, hi - lo)) * (H - 30)
  const pts = hs.map((h, i) => [x(i), y(h.temp)] as const)
  const d = pts.map(([px, py], i) => {
    if (i === 0) return `M${px},${py}`
    const [qx, qy] = pts[i - 1]
    const cx = (qx + px) / 2
    return `C${cx},${qy} ${cx},${py} ${px},${py}`
  }).join(' ')
  const minI = hs.findIndex((h) => h.hour === w.minHour), maxI = hs.findIndex((h) => h.hour === w.maxHour)
  const step = Math.ceil(hs.length / 6)
  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Temperatur von ${w.min}° bis ${w.max}°`}>
      <defs>
        <linearGradient id="tc" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="var(--cold)" />
          <stop offset="1" stopColor="var(--warm)" />
        </linearGradient>
        <linearGradient id="tcf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--warm)" stopOpacity=".18" />
          <stop offset="1" stopColor="var(--cold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${x(hs.length - 1)},${H - 14} L${x(0)},${H - 14} Z`} fill="url(#tcf)" />
      <path d={d} fill="none" stroke="url(#tc)" strokeWidth="2.5" strokeLinecap="round" className="curve-line" />
      {[minI, maxI].filter((i) => i >= 0).map((i) => (
        <g key={i}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r="4" fill="var(--card)" stroke={i === minI ? 'var(--cold)' : 'var(--warm)'} strokeWidth="2" />
          <text x={pts[i][0]} y={pts[i][1] - 8} textAnchor="middle" className="curve-val">{hs[i].temp}°</text>
        </g>
      ))}
      {hs.map((h, i) => (i % step === 0 || i === hs.length - 1) && (
        <text key={h.hour} x={x(i)} y={H - 1} textAnchor="middle" className="curve-hour">{h.hour}</text>
      ))}
    </svg>
  )
}
