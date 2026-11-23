export type Category =
  | 'oberteil'
  | 'unterteil'
  | 'kleid'
  | 'jacke'
  | 'schuhe'
  | 'hijab'
  | 'ring'
  | 'armband'
  | 'kette'
  | 'guertel'

export type Length = 'kurz' | 'mittel' | 'lang'
export type Sleeves = 'ohne' | 'kurz' | 'lang'
export type LayerRole = 'drunter' | 'drueber' | 'beides'
export type BottomType = 'hose' | 'rock' | 'shorts' | 'leggings'

export interface Item {
  id: string
  category: Category
  name: string
  image: Blob
  color: string // hex
  colorName: string
  warmth: number // 1–5
  length?: Length // kleid, rock, oberteil
  sleeves?: Sleeves // oberteil, kleid
  layer?: LayerRole // oberteil
  bottomType?: BottomType // unterteil
  waterproof?: boolean // jacke, schuhe
  tags: string[]
  createdAt: number
  lastWorn?: number
  wornCount: number
}

/** Rolle eines Teils innerhalb eines Outfits */
export type Slot =
  | 'unterschicht' // Oberteil drunter
  | 'oberteil'
  | 'kleid'
  | 'unterteil'
  | 'unterteilDrunter' // z. B. Leggings unter kurzem Rock
  | 'jacke'
  | 'schuhe'
  | 'hijab'
  | 'ring'
  | 'armband'
  | 'kette'
  | 'guertel'

export type OutfitParts = Partial<Record<Slot, string>> // slot -> item id

export type Template = 'einfach' | 'layering' | 'kleid' | 'kleidLayering'

export interface Outfit {
  id: string
  parts: OutfitParts
  template: Template
  createdAt: number
  name?: string
  saved: boolean // in "Meine Outfits" gespeichert
  wornDates: number[]
}

export type ShortRule = 'immer' | 'wetter' | 'ohne'
export type LayeringFreq = 'nie' | 'manchmal' | 'oft'

export interface Settings {
  hijab: boolean
  shortRule: ShortRule
  layering: LayeringFreq
  dayStart: number // Stunde
  dayEnd: number
  location?: { lat: number; lon: number; name: string }
  jewelry: boolean
}

export const defaultSettings: Settings = {
  hijab: true,
  shortRule: 'wetter',
  layering: 'manchmal',
  dayStart: 7,
  dayEnd: 16,
  jewelry: true,
}

export interface Preferences {
  item: Record<string, number>
  pair: Record<string, number>
  color: Record<string, number>
  tag: Record<string, number>
  template: Record<string, number>
  feature: Record<string, number> // z. B. "kurzMitDrunter", "kurzOhne"
}

export const emptyPrefs = (): Preferences => ({
  item: {},
  pair: {},
  color: {},
  tag: {},
  template: {},
  feature: {},
})

export interface DayWeather {
  min: number
  max: number
  minHour: number
  maxHour: number
  rain: boolean
  rainProb: number
  code: number
  hours: { hour: number; temp: number; rainProb: number; code: number }[]
}
