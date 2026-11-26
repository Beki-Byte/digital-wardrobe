import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore } from './store'
import { Today } from './pages/Today'
import { Wardrobe } from './pages/Wardrobe'
import { AddItem } from './pages/AddItem'
import { Outfits } from './pages/Outfits'
import { SettingsPage } from './pages/SettingsPage'
import { Icon, type IconName } from './components/Icon'
import { Intro } from './components/Intro'

type Tab = 'heute' | 'schrank' | 'neu' | 'outfits' | 'einstellungen'

const tabs: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'heute', icon: 'sparkle', label: 'Heute' },
  { id: 'schrank', icon: 'wardrobe', label: 'Schrank' },
  { id: 'neu', icon: 'plus', label: 'Scannen' },
  { id: 'outfits', icon: 'heart', label: 'Looks' },
  { id: 'einstellungen', icon: 'settings', label: 'Mehr' },
]


export default function App() {
  const { ready } = useStore()
  const [intro, setIntro] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const origin = useRef({ x: innerWidth / 2, y: innerHeight })
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'heute')

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
  }, [tab])


  const reveal = useCallback(() => setRevealed(true), [])

  const go = (t: Tab, e?: React.MouseEvent) => {
    if (t === tab) return
    if (e) origin.current = { x: e.clientX, y: e.clientY }
    document.documentElement.style.setProperty('--vt-x', `${origin.current.x}px`)
    document.documentElement.style.setProperty('--vt-y', `${origin.current.y}px`)
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    const run = () => {
      flushSync(() => setTab(t))
      window.scrollTo(0, 0)
    }
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(run)
    else run()
  }

  return (
    <>
      {intro && <Intro ready={ready} onReveal={reveal} onDone={() => setIntro(false)} />}
      {ready && (
    <div className={`app ${revealed ? 'revealed' : 'hidden-under'}`}>
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
            onClick={(e) => go(t.id, e)}
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
      )}
    </>
  )
}

