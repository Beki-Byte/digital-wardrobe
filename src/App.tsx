import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore } from './store'
import { Today } from './pages/Today'
import { Wardrobe } from './pages/Wardrobe'
import { AddItem } from './pages/AddItem'
import { Outfits } from './pages/Outfits'
import { SettingsPage } from './pages/SettingsPage'
import { Icon, type IconName } from './components/Icon'

type Tab = 'heute' | 'schrank' | 'neu' | 'outfits' | 'einstellungen'

const tabs: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'heute', icon: 'sparkle', label: 'Heute' },
  { id: 'schrank', icon: 'wardrobe', label: 'Schrank' },
  { id: 'neu', icon: 'plus', label: 'Scannen' },
  { id: 'outfits', icon: 'heart', label: 'Looks' },
  { id: 'einstellungen', icon: 'settings', label: 'Mehr' },
]

const INTRO_KEY = 'kleiderschrank:intro'
// Adresse beim Start merken, bevor die App #heute setzt
const startedWithHash = !!location.hash

export default function App() {
  const { ready, items } = useStore()
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'heute')

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
  }, [tab])

  // Beim allerersten Besuch: zur Startseite mit dem Schrank (falls vorhanden)
  useEffect(() => {
    if (!ready || items.length) return
    let seen = '1'
    try {
      seen = localStorage.getItem(INTRO_KEY) ?? ''
      localStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* privat-Modus */
    }
    if (seen || startedWithHash) return
    fetch('./start/', { method: 'HEAD' })
      .then((r) => r.ok && location.replace('./start/'))
      .catch(() => {})
  }, [ready, items.length])

  const go = (t: Tab) => {
    if (t === tab) return
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    const run = () => {
      flushSync(() => setTab(t))
      window.scrollTo(0, 0)
    }
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(run)
    else run()
  }

  if (!ready)
    return (
      <div className="loading">
        <span className="loading-mark">K</span>
      </div>
    )

  return (
    <div className="app">
      <main className="view">
        {tab === 'heute' && <Today goAdd={() => go('neu')} />}
        {tab === 'schrank' && <Wardrobe goAdd={() => go('neu')} />}
        {tab === 'neu' && <AddItem goWardrobe={() => go('schrank')} />}
        {tab === 'outfits' && <Outfits />}
        {tab === 'einstellungen' && <SettingsPage />}
      </main>
      <nav className="tabbar" aria-label="Hauptmenü">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`${tab === t.id ? 'on' : ''} ${t.id === 'neu' ? 'fab' : ''}`}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon">
              <Icon name={t.id === 'outfits' && tab === t.id ? 'heartFill' : t.icon} size={t.id === 'neu' ? 26 : 22} />
            </span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
