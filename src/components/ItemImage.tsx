import type { Item } from '../types'

const cache = new WeakMap<Blob, string>()

export function blobUrl(b: Blob) {
  let u = cache.get(b)
  if (!u) {
    u = URL.createObjectURL(b)
    cache.set(b, u)
  }
  return u
}

export function ItemImage({ item, className }: { item?: Item; className?: string }) {
  if (!item) return <div className={`img-missing ${className ?? ''}`}>?</div>
  return <img className={className} src={blobUrl(item.image)} alt={item.name || item.category} draggable={false} />
}
