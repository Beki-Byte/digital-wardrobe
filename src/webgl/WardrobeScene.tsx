import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { blobUrl } from '../components/ItemImage'
import { tier } from '../lib/quality'
import type { Category, Item } from '../types'
import { clothFragment, clothUniforms, clothVertex } from './cloth'

/* ------------------------------------------------------------------
 * Der Schrank aus deinen Fotos.
 * Korpus, Innenraum und zwei Türen sind Ebenen im Raum. Die Türen
 * öffnest DU: am Griff ziehen oder antippen. Erst wenn beide offen sind,
 * geht innen das Licht an und deine Sachen hängen an der Stange.
 * ------------------------------------------------------------------ */

export interface WardrobeState {
  left: number // Türwinkel 0 (zu) … OPEN (offen)
  right: number
  light: number // 0–1
  scroll: number
  target: number
  max: number
}

export const OPEN = 1.95

// Bildmaße des Schrank-Fotos (Pixel) → Welt
const IMG_W = 621, IMG_H = 1000
const WH = 4 // Welthöhe
const S = WH / IMG_H
const px = (x: number) => (x - IMG_W / 2) * S
const py = (y: number) => (IMG_H / 2 - y) * S

// Öffnung / Innenraum (aus dem Foto ausgemessen)
const HINGE_L = px(80), HINGE_R = px(542)
const DOOR_TOP = py(160), DOOR_BOTTOM = py(854)
const IN_X0 = px(100), IN_X1 = px(522)
const RAIL_Y = py(245)
const FLOOR_Y = py(818)
const GROUND_Y = py(968) // Unterkante der Füße
const IW = (IN_X1 - IN_X0) / 2

const HANG: Category[] = ['jacke', 'kleid', 'oberteil', 'unterteil', 'hijab']
const FLOOR: Category[] = ['schuhe', 'guertel', 'kette', 'armband', 'ring']
const heightOf: Partial<Record<Category, number>> = { kleid: 1.45, jacke: 1.2, oberteil: 0.85, unterteil: 1.0, hijab: 0.75 }
const floorH: Partial<Record<Category, number>> = { schuhe: 0.28, guertel: 0.16, kette: 0.18, armband: 0.14, ring: 0.12 }
const GAP = 0.36

const tex = (f: string) => `${import.meta.env.BASE_URL}schrank/${f}`

/* ---------- Texturen aus deinen Fotos ---------- */

const texCache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

function useItemTextures(items: Item[]) {
  const [, force] = useState(0)
  useEffect(() => {
    let alive = true
    for (const it of items) {
      const key = it.id + ':' + it.image.size
      if (texCache.has(key)) continue
      const t = loader.load(blobUrl(it.image), () => alive && force((n) => n + 1))
      t.colorSpace = THREE.SRGBColorSpace
      texCache.set(key, t)
    }
    return () => {
      alive = false
    }
  }, [items])
  return (it: Item) => texCache.get(it.id + ':' + it.image.size)
}

/* ---------- Kleidungsstück ---------- */

interface PieceProps {
  item: Item
  map: THREE.Texture
  baseX: number
  y: number
  h: number
  hanging: boolean
  phase: number
  st: WardrobeState
  selected: string | null
  onTap: (it: Item) => void
  dragged: React.RefObject<boolean>
  ratio: number
  spacing: number
}

function Piece({ item, map, baseX, y, h, hanging, phase, st, selected, onTap, dragged, ratio, spacing }: PieceProps) {
  const group = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => clothUniforms(map, phase), [map, phase])
  const img = map.image as { width?: number; height?: number } | undefined
  const aspect = img?.width && img?.height ? img.width / img.height : 0.8
  let ph = h, pw = h * aspect
  const maxW = hanging ? spacing * 1.6 : spacing * 0.95
  if (pw > maxW) {
    pw = maxW
    ph = pw / aspect
  }
  const zBase = -0.42 + (hanging ? (Math.round(phase / 1.7) % 2) * 0.04 : 0.1)
  const lastX = useRef(baseX)

  useFrame((s) => {
    const g = group.current
    if (!g) return
    const x = baseX - st.scroll * ratio
    g.position.x = x
    g.visible = Math.abs(x) < IW + spacing * 0.2
    if (!g.visible) return
    const isSel = selected === item.id
    g.position.z += ((isSel ? 0.25 : zBase) - g.position.z) * 0.12
    g.scale.setScalar(g.scale.x + ((isSel ? 1.12 : 1) - g.scale.x) * 0.12)
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uLight.value = st.light
    uniforms.uDim.value += ((selected && !isSel ? 0.55 : 0) - uniforms.uDim.value) * 0.1
    const v = x - lastX.current
    lastX.current = x
    uniforms.uPush.value += (THREE.MathUtils.clamp(-v * 18, -1, 1) - uniforms.uPush.value) * 0.08
    uniforms.uSway.value = hanging ? 1 : 0
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!group.current?.visible || st.light < 0.5) return
    e.stopPropagation()
    if (!dragged.current) onTap(item)
  }

  return (
    <group ref={group} position={[baseX, y, zBase]}>
      {hanging && (
        <mesh position={[0, 0.04, 0]}>
          <torusGeometry args={[0.028, 0.006, 6, 14, Math.PI * 1.4]} />
          <meshBasicMaterial color="#b89b6a" />
        </mesh>
      )}
      <mesh position={[0, hanging ? -0.04 - ph / 2 : 0, 0]} onClick={click}>
        <planeGeometry args={[pw, ph, hanging ? (tier === 'high' ? 16 : 10) : 1, hanging ? (tier === 'high' ? 24 : 14) : 1]} />
        <shaderMaterial uniforms={uniforms} vertexShader={clothVertex} fragmentShader={clothFragment} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ---------- Tür ---------- */

type Side = 'left' | 'right'

function Door({ side, st, onGrab }: { side: Side; st: WardrobeState; onGrab: (side: Side, e: ThreeEvent<PointerEvent>) => void }) {
  const map = useLoader(THREE.TextureLoader, tex(side === 'left' ? 'door-left.webp' : 'door-right.webp'))
  map.colorSpace = THREE.SRGBColorSpace
  const pivot = useRef<THREE.Group>(null)
  const front = useRef<THREE.MeshBasicMaterial>(null)
  const back = useRef<THREE.MeshBasicMaterial>(null)
  const hx = side === 'left' ? HINGE_L : HINGE_R
  const dw = (HINGE_R - HINGE_L) / 2 + 0.01
  const dh = DOOR_TOP - DOOR_BOTTOM
  const cy = (DOOR_TOP + DOOR_BOTTOM) / 2
  const dir = side === 'left' ? 1 : -1

  useFrame(() => {
    const a = st[side]
    if (pivot.current) pivot.current.rotation.y = -dir * a
    // je weiter offen, desto mehr im Schatten
    front.current?.color.setScalar(1 - Math.sin(Math.min(a, Math.PI / 2)) * 0.28)
    const l = 0.72 + 0.28 * st.light
    back.current?.color.setRGB(0.84 * l, 0.79 * l, 0.7 * l)
  })

  return (
    <group ref={pivot} position={[hx, cy, 0.03]}>
      <mesh position={[(dir * dw) / 2, 0, 0.012]} onPointerDown={(e) => onGrab(side, e)}>
        <planeGeometry args={[dw, dh]} />
        <meshBasicMaterial ref={front} map={map} transparent alphaTest={0.4} />
      </mesh>
      <mesh position={[(dir * dw) / 2, 0, -0.012]} rotation={[0, Math.PI, 0]} onPointerDown={(e) => onGrab(side, e)}>
        <planeGeometry args={[dw, dh]} />
        <meshBasicMaterial ref={back} map={map} transparent alphaTest={0.4} />
      </mesh>
      <mesh position={[dir * dw, -0.05, 0]}>
        <boxGeometry args={[0.012, dh * 0.86, 0.024]} />
        <meshBasicMaterial color="#d9c9a8" />
      </mesh>
    </group>
  )
}

/* ---------- Korpus + Innenraum ---------- */

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 20, 4, 64, 40, 90)
  g.addColorStop(0, 'rgba(255,236,200,1)')
  g.addColorStop(1, 'rgba(255,236,200,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function Cabinet({ st }: { st: WardrobeState }) {
  const [body, inside] = useLoader(THREE.TextureLoader, [tex('body.webp'), tex('interior.webp')])
  body.colorSpace = inside.colorSpace = THREE.SRGBColorSpace
  const glowMap = useMemo(glowTexture, [])
  const inMat = useRef<THREE.MeshBasicMaterial>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const depth = 0.55
  const ix0 = px(80), ix1 = px(542), iy0 = py(160), iy1 = py(856)
  useFrame(() => {
    inMat.current?.color.setScalar(0.32 + st.light * 0.68)
    if (glow.current) glow.current.opacity = st.light * 0.55
  })
  return (
    <>
      <mesh position={[(ix0 + ix1) / 2, (iy0 + iy1) / 2, -depth]} scale={1.07}>
        <planeGeometry args={[ix1 - ix0, iy0 - iy1]} />
        <meshBasicMaterial ref={inMat} map={inside} transparent alphaTest={0.3} />
      </mesh>
      <mesh position={[0, RAIL_Y + 0.25, -depth + 0.02]}>
        <planeGeometry args={[IW * 2.2, 1.6]} />
        <meshBasicMaterial ref={glow} map={glowMap} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, RAIL_Y + 0.02, -0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, IW * 2 + 0.1, 12]} />
        <meshStandardMaterial color="#c9a45a" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={[IMG_W * S, IMG_H * S]} />
        <meshBasicMaterial map={body} transparent alphaTest={0.35} />
      </mesh>
      <Floor />
    </>
  )
}

/** Boden mit weichem Schatten unter dem Schrank – damit nichts schwebt */
function floorTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const x = c.getContext('2d')!
  // Boden: zur Mitte hin vom Licht leicht aufgehellt
  const g = x.createRadialGradient(256, 200, 10, 256, 220, 300)
  g.addColorStop(0, 'rgba(120,88,64,1)')
  g.addColorStop(0.55, 'rgba(58,40,29,1)')
  g.addColorStop(1, 'rgba(28,19,14,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 512, 512)
  // Kontaktschatten unter dem Schrank
  x.save()
  x.translate(256, 196)
  x.scale(1, 0.32)
  const sh = x.createRadialGradient(0, 0, 8, 0, 0, 115)
  sh.addColorStop(0, 'rgba(8,4,2,0.95)')
  sh.addColorStop(0.6, 'rgba(8,4,2,0.55)')
  sh.addColorStop(1, 'rgba(8,4,2,0)')
  x.fillStyle = sh
  x.beginPath()
  x.arc(0, 0, 115, 0, Math.PI * 2)
  x.fill()
  x.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Floor() {
  const map = useMemo(floorTexture, [])
  return (
    <mesh position={[0, GROUND_Y, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[9, 9]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} />
    </mesh>
  )
}

/* ---------- Kamera ---------- */

function CameraRig({ st }: { st: WardrobeState }) {
  const { camera, size, pointer } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const par = useRef(new THREE.Vector2())
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const fit = (w: number, h: number) => Math.max(w / 2 / (tanH * aspect), h / 2 / tanH)
    // Platz lassen für Titel oben und Leiste unten
    const z0 = fit(IMG_W * S * 1.2, WH * 1.42)
    const z1 = fit((IN_X1 - IN_X0) * 1.25, (RAIL_Y - FLOOR_Y) * 1.35)
    const l = st.light
    st.scroll += (st.target - st.scroll) * 0.12
    par.current.lerp(pointer, 0.05)
    const y = -0.05 * (1 - l) + ((RAIL_Y + FLOOR_Y) / 2 - 0.1) * l
    camera.position.set(par.current.x * 0.25, y + par.current.y * 0.12, z0 + (z1 - z0) * l)
    look.set(0, y, 0)
    camera.lookAt(look)
  })
  return null
}

/* ---------- Inhalt ---------- */

export interface SceneProps {
  items: Item[]
  st: WardrobeState
  selected: string | null
  onTap: (it: Item | null) => void
  dragged: React.RefObject<boolean>
  onReady?: () => void
  onDoorsChange?: (open: boolean) => void
}

function Contents({ items, st, selected, onTap, dragged }: SceneProps) {
  const texOf = useItemTextures(items)
  const { size } = useThree()
  // Hochformat: größere Teile, die Kamera ist dann näher am Innenraum
  const k = size.width < size.height ? 1.5 : 1.1
  const sp = GAP * k, fsp = GAP * 0.8 * k
  const hanging = useMemo(
    () => items.filter((i) => HANG.includes(i.category)).sort((a, b) => HANG.indexOf(a.category) - HANG.indexOf(b.category)),
    [items],
  )
  const floor = useMemo(
    () => items.filter((i) => FLOOR.includes(i.category)).sort((a, b) => FLOOR.indexOf(a.category) - FLOOR.indexOf(b.category)),
    [items],
  )
  const left = -IW + sp / 2
  const maxHang = Math.max(0, (hanging.length - 1) * sp - (2 * IW - sp))
  const maxFloor = Math.max(0, (floor.length - 1) * fsp - (2 * IW - fsp))
  st.max = Math.max(maxHang, maxFloor)
  const floorRatio = maxFloor && st.max ? maxFloor / st.max : 1
  return (
    <>
      {hanging.map((it, i) => {
        const map = texOf(it)
        return map ? (
          <Piece key={it.id} item={it} map={map} baseX={left + i * sp} y={RAIL_Y} h={(heightOf[it.category] ?? 1) * k}
            hanging phase={i * 1.7} st={st} selected={selected} onTap={onTap} dragged={dragged} ratio={1} spacing={sp} />
        ) : null
      })}
      {floor.map((it, i) => {
        const map = texOf(it)
        const h = (floorH[it.category] ?? 0.2) * k
        return map ? (
          <Piece key={it.id} item={it} map={map} baseX={left + i * fsp} y={FLOOR_Y + h / 2} h={h}
            hanging={false} phase={i} st={st} selected={selected} onTap={onTap} dragged={dragged} ratio={floorRatio} spacing={fsp} />
        ) : null
      })}
    </>
  )
}

/* ---------- Türen bedienen: am Griff ziehen oder antippen ---------- */

function Doors({ st, onDoorsChange, dragged }: Pick<SceneProps, 'st' | 'onDoorsChange' | 'dragged'>) {
  const { size } = useThree()
  const grab = useRef<{ side: Side; x: number; a: number; moved: boolean } | null>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const settle = (side: Side, to: number) =>
      gsap.to(st, { [side]: to, duration: to ? 1.1 : 0.7, ease: to ? 'power3.out' : 'power2.in', overwrite: 'auto' })
    const move = (e: PointerEvent) => {
      const g = grab.current
      if (!g) return
      const dx = (e.clientX - g.x) * (g.side === 'left' ? -1 : 1)
      if (Math.abs(dx) > 6) g.moved = true
      st[g.side] = THREE.MathUtils.clamp(g.a + (dx / (size.width * 0.35)) * OPEN, 0, OPEN)
    }
    const up = () => {
      const g = grab.current
      if (!g) return
      grab.current = null
      const a = st[g.side]
      if (!g.moved) settle(g.side, a > OPEN / 2 ? 0 : OPEN)
      else settle(g.side, a > 0.6 ? OPEN : 0)
      setTimeout(() => (dragged.current = false), 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [st, size.width, dragged])

  useFrame(() => {
    const open = Math.min(st.left, st.right) / OPEN
    st.light += ((open > 0.55 ? 1 : 0) - st.light) * 0.045
    const isOpen = st.light > 0.5
    if (isOpen !== wasOpen.current) {
      wasOpen.current = isOpen
      onDoorsChange?.(isOpen)
    }
  })

  const onGrab = (s: Side, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    dragged.current = true
    grab.current = { side: s, x: e.clientX, a: st[s], moved: false }
    gsap.killTweensOf(st, s)
  }

  return (
    <>
      <Door side="left" st={st} onGrab={onGrab} />
      <Door side="right" st={st} onGrab={onGrab} />
    </>
  )
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

export default function WardrobeCanvas(props: SceneProps) {
  return (
    <Canvas
      className="webgl"
      dpr={tier === 'high' ? [1, 2] : [1, 1.75]}
      camera={{ position: [0, 0.25, 9], fov: 35, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => props.onTap(null)}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[0, 3, 4]} intensity={1.2} />
      <CameraRig st={props.st} />
      <Suspense fallback={null}>
        <Cabinet st={props.st} />
        <Contents {...props} />
        <Doors st={props.st} onDoorsChange={props.onDoorsChange} dragged={props.dragged} />
        <Ready onReady={props.onReady} />
      </Suspense>
    </Canvas>
  )
}
