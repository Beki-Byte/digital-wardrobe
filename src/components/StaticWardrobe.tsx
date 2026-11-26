/** Fallback ohne WebGL / bei "Bewegung reduzieren": offener Schrank als SVG */
export function StaticWardrobe() {
  const clothes = [
    ['#6f4b37', 150], ['#f2e6d0', 100], ['#21463a', 170], ['#8fb0cf', 90], ['#d79a8c', 135],
  ] as const
  return (
    <svg className="static-wardrobe" viewBox="0 0 400 420" role="img" aria-label="Ein geöffneter Kleiderschrank mit Kleidern">
      <rect x="110" y="40" width="180" height="330" rx="4" fill="#d9c2a0" />
      <rect x="104" y="30" width="192" height="14" rx="4" fill="#7d5236" />
      <rect x="104" y="366" width="192" height="12" rx="3" fill="#7d5236" />
      <path d="M110 40 L40 62 V352 L110 370Z" fill="#9a6a48" />
      <path d="M290 40 L360 62 V352 L290 370Z" fill="#9a6a48" />
      <line x1="118" y1="80" x2="282" y2="80" stroke="#cfcac0" strokeWidth="4" />
      {clothes.map(([c, h], i) => (
        <path key={i} d={`M${135 + i * 32} 86 l-14 8 v${h} h28 v-${h} z`} fill={c} />
      ))}
      <rect x="118" y="300" width="164" height="5" fill="#9a6a48" />
    </svg>
  )
}
