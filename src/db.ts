import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  defaultSettings,
  emptyPrefs,
  type Item,
  type Outfit,
  type Preferences,
  type Settings,
} from './types'

interface WardrobeDB extends DBSchema {
  items: { key: string; value: Item }
  outfits: { key: string; value: Outfit }
  meta: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<WardrobeDB>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<WardrobeDB>('kleiderschrank', 1, {
      upgrade(d) {
        d.createObjectStore('items', { keyPath: 'id' })
        d.createObjectStore('outfits', { keyPath: 'id' })
        d.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36))

export const getItems = async () => (await db()).getAll('items')
export const putItem = async (item: Item) => (await db()).put('items', item)
export const deleteItem = async (id: string) => (await db()).delete('items', id)

export const getOutfits = async () => (await db()).getAll('outfits')
export const putOutfit = async (o: Outfit) => (await db()).put('outfits', o)
export const deleteOutfit = async (id: string) => (await db()).delete('outfits', id)

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get('meta', 'settings')) as Partial<Settings> | undefined
  return { ...defaultSettings, ...s }
}
export const saveSettings = async (s: Settings) => (await db()).put('meta', s, 'settings')

export async function getPrefs(): Promise<Preferences> {
  const p = (await (await db()).get('meta', 'prefs')) as Partial<Preferences> | undefined
  return { ...emptyPrefs(), ...p }
}
export const savePrefs = async (p: Preferences) => (await db()).put('meta', p, 'prefs')

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key)) as T | undefined
}
export const setMeta = async (key: string, v: unknown) => (await db()).put('meta', v, key)

/* ---------- Backup ---------- */

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(b)
  })

export async function exportAll(): Promise<Blob> {
  const items = await getItems()
  const data = {
    app: 'digitaler-kleiderschrank',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: await Promise.all(items.map(async (i) => ({ ...i, image: await blobToDataUrl(i.image) }))),
    outfits: await getOutfits(),
    settings: await getSettings(),
    prefs: await getPrefs(),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

export async function importAll(file: File) {
  const data = JSON.parse(await file.text())
  if (data.app !== 'digitaler-kleiderschrank') throw new Error('Das ist keine Kleiderschrank-Sicherung.')
  const d = await db()
  const tx = d.transaction(['items', 'outfits', 'meta'], 'readwrite')
  await tx.objectStore('items').clear()
  await tx.objectStore('outfits').clear()
  await tx.objectStore('meta').clear()
  await tx.done
  for (const i of data.items) {
    const image = await (await fetch(i.image)).blob()
    await putItem({ ...i, image })
  }
  for (const o of data.outfits) await putOutfit(o)
  if (data.settings) await saveSettings(data.settings)
  if (data.prefs) await savePrefs(data.prefs)
}

export async function wipeAll() {
  const d = await db()
  const tx = d.transaction(['items', 'outfits', 'meta'], 'readwrite')
  await tx.objectStore('items').clear()
  await tx.objectStore('outfits').clear()
  await tx.objectStore('meta').clear()
  await tx.done
}
