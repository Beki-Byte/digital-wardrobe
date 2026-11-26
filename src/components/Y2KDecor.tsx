/** Funkelnde Sterne und Schmetterlinge im Hintergrund (rein dekorativ) */
const Star = ({ x, y, s, d, c }: { x: string; y: string; s: number; d: number; c: string }) => (
  <svg className="twinkle" style={{ left: x, top: y, width: s, height: s, animationDelay: `${d}s` }} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0z" fill={c} />
  </svg>
)

const Butterfly = ({ x, y, s, d, c1, c2 }: { x: string; y: string; s: number; d: number; c1: string; c2: string }) => (
  <svg className="flutter" style={{ left: x, top: y, width: s, height: s, animationDelay: `${d}s` }} viewBox="0 0 40 32" aria-hidden="true">
    <defs>
      <linearGradient id={`bf${d}`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={c1} />
        <stop offset="1" stopColor={c2} />
      </linearGradient>
    </defs>
    <path d="M20 16C16 4 4 0 2 6s6 10 18 10zM20 16c4-12 16-16 18-10s-6 10-18 10zM20 16c-6 2-14 6-12 12s10-4 12-12zM20 16c6 2 14 6 12 12s-10-4-12-12z" fill={`url(#bf${d})`} stroke="#fff" strokeWidth="1.2" />
    <path d="M20 9v18" stroke="#6b4a8a" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export function Y2KDecor() {
  return (
    <div className="y2k-decor" aria-hidden="true">
      <Star x="8%" y="12%" s={18} d={0} c="#ff7cc8" />
      <Star x="86%" y="8%" s={26} d={0.8} c="#8fd0ff" />
      <Star x="72%" y="34%" s={12} d={1.6} c="#c9a8ff" />
      <Star x="4%" y="52%" s={22} d={2.2} c="#ffffff" />
      <Star x="92%" y="62%" s={16} d={0.4} c="#ff7cc8" />
      <Star x="18%" y="80%" s={14} d={1.2} c="#8fd0ff" />
      <Star x="60%" y="88%" s={20} d={2.6} c="#ffffff" />
      <Butterfly x="80%" y="20%" s={44} d={0} c1="#ffb3e1" c2="#b9a8ff" />
      <Butterfly x="2%" y="68%" s={34} d={2.5} c1="#a9dcff" c2="#ffc4ea" />
    </div>
  )
}
