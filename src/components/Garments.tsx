/** Stilisierte Kleidungsstücke als SVG (für Sektionen ohne 3D) */

type P = { className?: string; style?: React.CSSProperties }

export const Blouse = ({ className, style }: P) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <defs>
      <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#f4ead8" />
        <circle cx="9" cy="9" r="3.2" fill="#c4705f" />
      </pattern>
      <linearGradient id="fold" x1="0" x2="1">
        <stop offset="0" stopColor="#000" stopOpacity=".12" />
        <stop offset=".5" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".12" />
      </linearGradient>
    </defs>
    <path d="M98 12h64l84 62-8 150h-30l-8-104 6 168H64l6-168-8 104H32l-8-150z" fill="url(#dots)" />
    <path d="M98 12h64l84 62-8 150h-30l-8-104 6 168H64l6-168-8 104H32l-8-150z" fill="url(#fold)" />
    <path d="M110 12c6 22 34 22 40 0" fill="none" stroke="#c4705f" strokeWidth="4" />
  </svg>
)

export const Shirt = ({ className, style, color = '#f6f1e7' }: P & { color?: string }) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <path d="M98 10h64l40 16 6 8 46 50-30 34-26-24v196H62V94l-26 24-30-34 46-50 6-8z" fill={color} />
    <path d="M112 10l18 30 18-30" fill="none" stroke="#00000022" strokeWidth="3" />
    <path d="M130 40v240" stroke="#00000018" strokeWidth="2" />
    {[70, 110, 150, 190, 230].map((y) => (
      <circle key={y} cx="136" cy={y} r="3" fill="#00000030" />
    ))}
  </svg>
)

export const ShortDress = ({ className, style }: P) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <path d="M96 8h68l10 70-6 40 70 142H22l70-142-6-40z" fill="#21463a" />
    <path d="M86 118h88" stroke="#ffffff30" strokeWidth="3" />
    <path d="M110 120l-40 140M150 120l40 140M130 120v140" stroke="#00000022" strokeWidth="2" />
  </svg>
)

export const Pants = ({ className, style, color = '#3f5f86' }: P & { color?: string }) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <path d="M70 6h120l16 288h-68l-8-200-8 200H54z" fill={color} />
    <path d="M70 26h120" stroke="#00000030" strokeWidth="3" />
    <path d="M130 30v40" stroke="#00000030" strokeWidth="2" />
  </svg>
)

export const Coat = ({ className, style }: P) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <path d="M90 8h80l70 50 12 180h-34l-10-120 6 176H56l6-176-10 120H18L30 58z" fill="#7a5238" />
    <path d="M90 8l40 70 40-70M130 78v216" fill="none" stroke="#00000030" strokeWidth="3" />
    {[120, 170, 220].map((y) => (
      <circle key={y} cx="142" cy={y} r="5" fill="#d6a95a" />
    ))}
  </svg>
)

export const Sweater = ({ className, style }: P) => (
  <svg viewBox="0 0 260 300" className={className} style={style}>
    <path d="M96 10h68l82 60-4 170h-34l-6-120v168H58V120l-6 120H18L14 70z" fill="#d79a8c" />
    {Array.from({ length: 9 }, (_, i) => (
      <path key={i} d={`M${66 + i * 16} 110v170`} stroke="#00000014" strokeWidth="3" />
    ))}
    <path d="M58 272h144" stroke="#00000025" strokeWidth="8" />
  </svg>
)
