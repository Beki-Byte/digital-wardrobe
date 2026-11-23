import { useEffect, useState } from 'react'
import { useStore } from './store'
import { Today } from './pages/Today'
import { Wardrobe } from './pages/Wardrobe'
import { AddItem } from './pages/AddItem'
import { Outfits } from './pages/Outfits'
import { SettingsPage } from './pages/SettingsPage'

type Tab = 'heute' | 'schrank' | 'neu' | 'outfits' | 'einstellungen'

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'heute', icon: '✨', label: 'Heute' },
  { id: 'schrank', icon: '🚪', label: 'Schrank' },
  { id: 'neu', icon: '＋', label: 'Scannen' },
  { id: 'outfits', icon: '❤️', label: 'Outfits' },
  { id: 'einstellungen', icon: '⚙️', label: 'Mehr' },
]

export default function App() {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'heute')

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo(0, 0)
  }, [tab])

  if (!ready) return <div className="loading">Lädt …</div>

  return (
    <div className="app">
      <main>
        {tab === 'heute' && <Today goAdd={() => setTab('neu')} />}
        {tab === 'schrank' && <Wardrobe goAdd={() => setTab('neu')} />}
        {tab === 'neu' && <AddItem goWardrobe={() => setTab('schrank')} />}
        {tab === 'outfits' && <Outfits />}
        {tab === 'einstellungen' && <SettingsPage />}
      </main>
      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={`${tab === t.id ? 'on' : ''} ${t.id === 'neu' ? 'fab' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
