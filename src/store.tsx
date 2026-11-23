import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as db from './db'
import { defaultSettings, emptyPrefs, type Item, type Outfit, type Preferences, type Settings } from './types'

interface Store {
  ready: boolean
  items: Item[]
  outfits: Outfit[]
  settings: Settings
  prefs: Preferences
  saveItem: (i: Item) => Promise<void>
  removeItem: (id: string) => Promise<void>
  saveOutfit: (o: Outfit) => Promise<void>
  removeOutfit: (id: string) => Promise<void>
  setSettings: (s: Settings) => Promise<void>
  setPrefs: (p: Preferences) => Promise<void>
  reload: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [settings, setS] = useState<Settings>(defaultSettings)
  const [prefs, setP] = useState<Preferences>(emptyPrefs())

  const reload = useCallback(async () => {
    const [i, o, s, p] = await Promise.all([db.getItems(), db.getOutfits(), db.getSettings(), db.getPrefs()])
    setItems(i.sort((a, b) => b.createdAt - a.createdAt))
    setOutfits(o.sort((a, b) => b.createdAt - a.createdAt))
    setS(s)
    setP(p)
    setReady(true)
  }, [])

  useEffect(() => {
    reload()
    // Browser bitten, die Daten dauerhaft zu behalten
    navigator.storage?.persist?.().catch(() => {})
  }, [reload])

  const store: Store = {
    ready,
    items,
    outfits,
    settings,
    prefs,
    async saveItem(i) {
      await db.putItem(i)
      setItems((l) => [i, ...l.filter((x) => x.id !== i.id)].sort((a, b) => b.createdAt - a.createdAt))
    },
    async removeItem(id) {
      await db.deleteItem(id)
      setItems((l) => l.filter((x) => x.id !== id))
      // Outfits, die das Teil enthalten, bleiben – das Teil fehlt dann einfach
    },
    async saveOutfit(o) {
      await db.putOutfit(o)
      setOutfits((l) => [o, ...l.filter((x) => x.id !== o.id)].sort((a, b) => b.createdAt - a.createdAt))
    },
    async removeOutfit(id) {
      await db.deleteOutfit(id)
      setOutfits((l) => l.filter((x) => x.id !== id))
    },
    async setSettings(s) {
      await db.saveSettings(s)
      setS(s)
    },
    async setPrefs(p) {
      await db.savePrefs(p)
      setP(p)
    },
    reload,
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)!
