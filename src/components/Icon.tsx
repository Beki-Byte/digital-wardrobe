import type { Category } from '../types'

/** Schlichte Linien-Icons (24×24, stroke = currentColor) */
const paths: Record<string, string> = {
  // Navigation / UI
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.2 2.2M15.3 15.3l2.2 2.2M17.5 6.5l-2.2 2.2M8.7 15.3l-2.2 2.2',
  wardrobe: 'M5 3h14v18H5zM12 3v18M9.5 11v2M14.5 11v2M5 21v1M19 21v1',
  plus: 'M12 5v14M5 12h14',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  heartFill: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5M4 4v3h3M4 13a8 8 0 0 0 14.6 4.5M20 20v-3h-3',
  x: 'M6 6l12 12M18 6L6 18',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  dislike: 'M7 14V4M7 14l4 6a2 2 0 0 0 2-2v-3h5a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 16.8 4H7M7 4H4v10h3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  back: 'M15 5l-7 7 7 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  umbrella: 'M3 12a9 9 0 0 1 18 0zM12 12v6a2 2 0 0 0 4 0M12 3v0',
  layers: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  wand: 'M5 19L15 9M14 4v2M19 9h2M17 5l1.5-1.5M18 12l1 1M10 4l1 1',
  // Wetter
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5',
  partly: 'M8 4v1.5M3.5 9H5M4.8 5.8l1 1M11.2 5.8l-1 1M7 12.5a3.5 3.5 0 1 1 5.5-3.6M9 19h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.3A2.9 2.9 0 0 0 9 19z',
  cloud: 'M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18z',
  rain: 'M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  snow: 'M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14zM8 18h.01M12 20h.01M16 18h.01M10 22h.01M14 22h.01',
  fog: 'M4 9h16M6 13h12M4 17h16',
  storm: 'M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14zM12 14l-2 4h4l-2 4',
  // Kategorien
  oberteil: 'M8 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3a4 4 0 0 1-8 0z',
  unterteil: 'M7 3h10l1 18h-4.5L12 10l-1.5 11H6z',
  kleid: 'M9 3h6l-1 5 5 13H5l5-13z M9 3c1 1.3 2 2 3 2s2-.7 3-2',
  jacke: 'M8 3l-5 4v13h5M16 3l5 4v13h-5M8 3l4 6 4-6M12 9v12M8 20h8M8 13h1.5M14.5 13H16',
  schuhe: 'M3 17V9h5l2 4 8 1.5a3 3 0 0 1 3 2.5V18H3zM3 15h18',
  hijab: 'M12 3a7 7 0 0 0-7 7v4c0 3 2 5 4 7h6c2-2 4-4 4-7v-4a7 7 0 0 0-7-7zM9.5 11a2.5 2.5 0 0 0 5 0v-1a2.5 2.5 0 0 0-5 0z',
  ring: 'M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9.5 5L12 3l2.5 2L12 8.5z',
  armband: 'M12 19c4.4 0 8-2.7 8-6s-3.6-6-8-6-8 2.7-8 6 3.6 6 8 6zM12 16c2.8 0 5-1.3 5-3s-2.2-3-5-3-5 1.3-5 3 2.2 3 5 3z',
  kette: 'M5 3c0 7 3 11 7 11s7-4 7-11M12 14v2.5M12 21a2.2 2.2 0 1 0 0-4.5 2.2 2.2 0 0 0 0 4.5z',
  guertel: 'M3 10h18v4H3zM9 9h6v6H9zM12 12h3',
  drunter: 'M9 4l-4 2.5 1.5 3L8 9v11h8V9l1.5.5 1.5-3L15 4c-.5 1.5-1.6 2.5-3 2.5S9.5 5.5 9 4z',
  leggings: 'M8 3h8l-.5 18h-3L12 9l-.5 12h-3z',
}

export type IconName = keyof typeof paths | Category

export function Icon({ name, size = 22, className, stroke = 1.6 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  const fill = name === 'heartFill' ? 'currentColor' : 'none'
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export const weatherIcon = (code: number): IconName =>
  code === 0 ? 'sun' : code <= 2 ? 'partly' : code === 3 ? 'cloud' : code <= 48 ? 'fog' : code <= 67 ? 'rain' : code <= 77 ? 'snow' : code <= 82 ? 'rain' : code <= 86 ? 'snow' : 'storm'
