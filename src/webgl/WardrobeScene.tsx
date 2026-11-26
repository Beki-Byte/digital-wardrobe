import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { blobUrl } from '../components/ItemImage'
import { tier } from '../lib/quality'
import type { Category, Item } from '../types'
import { clothFragment, clothUniforms, clothVertex } from './cloth'

/* ------------------------------------------------------------------
 * Der Schrank in der App.
 * state.open (0–1) öffnet Türen + Licht, state.dolly fährt die Kamera rein.
 * Deine Teile hängen als Stoff an der Stange (Foto als Textur),
 * Schuhe & Schmuck stehen unten. Wischen schiebt die Bügel.
 * ------------------------------------------------------------------ */

export interface WardrobeState {
  open: number
  dolly: number
  scroll: number
  target: number
  max: number
}

const W = 2.4, H = 3.2, D = 1.0, T = 0.06
const IW = W / 2 - T // halbe Innenbreite
const RAIL_Y = 1.22
const S = 0.46 // Abstand Bügel
const FS = 0.4 // Abstand unten
const HANG: Category[] = ['jacke', 'kleid', 'oberteil', 'unterteil', 'hijab']
const FLOOR: Category[] = ['schuhe', 'guertel', 'kette', 'armband', 'ring']
const heightOf: Partial<Record<Category, number>> = { kleid: 1.55, jacke: 1.3, oberteil: 0.95, unterteil: 1.15, hijab: 0.85 }
const floorH: Partial<Record<Category, number>> = { schuhe: 0.3, guertel: 0.18, kette: 0.2, armband: 0.15, ring: 0.13 }

const wood = new THREE.MeshStandardMaterial({ color: '#9a6a48', roughness: 0.55 })
const woodDark = new THREE.MeshStandardMaterial({ color: '#7d5236', roughness: 0.6 })
const inside = new THREE.MeshStandardMaterial({ color: '#d9c2a0', roughness: 0.9 })
const brass = new THREE.MeshStandardMaterial({ color: '#d6a95a', roughness: 0.25, metalness: 0.9 })
const chrome = new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.2, metalness: 1 })

/* ---------- Texturen aus deinen Fotos (zwischengespeichert) ---------- */

const texCache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

function useTextures(items: Item[]) {
  const [, force] = useState(0)
  useEffect(() => {
    let alive = true
    for (const it of items) {
      const key = it.id + ':' + it.image.size
      if (texCache.has(key)) continue
      const t = loader.load(blobUrl(it.image), () => alive && force((n) => n + 1))
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      texCache.set(key, t)
    }
    return () => {
      alive = false
    }
  }, [items])
  return (it: Item) => texCache.get(it.id + ':' + it.image.size)
}

/* ---------- ein hängendes / stehendes Teil ---------- */

interface PieceProps {
  item: Item
  tex: THREE.Texture
  baseX: number
  y: number
  h: number
  hanging: boolean
  phase: number
  st: WardrobeState
  selected: string | null
  onTap: (it: Item) => void
  dragged: React.RefObject<boolean>
  ratio?: number
  spacing: number
}

function Piece({ item, tex, baseX, y, h, hanging, phase, st, selected, onTap, dragged, ratio = 1, spacing }: PieceProps) {
  const group = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => clothUniforms(tex, phase), [tex, phase])
  const img = tex.image as { width?: number; height?: number } | undefined
  const aspect = img?.width && img?.height ? img.width / img.height : 0.8
  let ph = h, pw = h * aspect
  const maxW = hanging ? spacing * 1.6 : spacing * 0.95
  if (pw > maxW) {
    pw = maxW
    ph = pw / aspect
  }
  const lastX = useRef(baseX)
  // abwechselnd leicht versetzt, damit sich überlappende Teile nicht flackern
  const zBase = hanging ? (Math.round(phase / 1.7) % 2) * 0.05 : 0.04

  useFrame((s) => {
    const g = group.current
    if (!g) return
    const x = baseX - st.scroll * ratio
    const inside = Math.abs(x) < IW - spacing * 0.35
    g.position.x = x
    g.visible = inside
    if (!inside) return
    const isSel = selected === item.id
    g.position.z += ((isSel ? 0.42 : zBase) - g.position.z) * 0.12
    const sc = g.scale.x + ((isSel ? 1.14 : 1) - g.scale.x) * 0.12
    g.scale.setScalar(sc)
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uLight.value = Math.min(1, st.open * 1.3)
    uniforms.uDim.value += ((selected && !isSel ? 0.55 : 0) - uniforms.uDim.value) * 0.1
    // beim Schieben schwingen die Teile nach
    const v = x - lastX.current
    lastX.current = x
    uniforms.uPush.value += (THREE.MathUtils.clamp(-v * 18, -1, 1) - uniforms.uPush.value) * 0.08
    uniforms.uSway.value = hanging ? 1 : 0
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    // unsichtbare (weggeschobene) Teile nehmen keine Klicks an
    if (!group.current?.visible) return
    e.stopPropagation()
    if (!dragged.current) onTap(item)
  }

  return (
    <group ref={group} position={[baseX, y, 0]}>
      {hanging && (
        <>
          <mesh position={[0, 0.05, 0]} material={chrome}>
            <torusGeometry args={[0.032, 0.007, 6, 14, Math.PI * 1.4]} />
          </mesh>
          <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={woodDark}>
            <cylinderGeometry args={[0.011, 0.011, Math.min(pw * 0.9, 0.4), 8]} />
          </mesh>
        </>
      )}
      <mesh position={[0, hanging ? -0.04 - ph / 2 : 0, 0.02]} onClick={click}>
        <planeGeometry args={[pw, ph, hanging ? (tier === 'high' ? 16 : 10) : 1, hanging ? (tier === 'high' ? 24 : 14) : 1]} />
        <shaderMaterial uniforms={uniforms} vertexShader={clothVertex} fragmentShader={clothFragment} side={THREE.DoubleSide} transparent={false} />
      </mesh>
    </group>
  )
}

/* ---------- Schrank-Korpus ---------- */

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)

function Door({ side, st }: { side: -1 | 1; st: WardrobeState }) {
  const ref = useRef<THREE.Group>(null)
  const dw = W / 2 - 0.01
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = (side === -1 ? -1 : 1) * ease(st.open) * 1.95
  })
  return (
    <group ref={ref} position={[side * (W / 2), 0, D / 2 + 0.03]}>
      <group position={[-side * (dw / 2), 0, 0]}>
        <RoundedBox args={[dw, H - 0.2, 0.05]} radius={0.015} smoothness={3} material={wood} />
        {[0.75, -0.55].map((y, i) => (
          <mesh key={i} position={[0, y, 0.03]} material={woodDark}>
            <boxGeometry args={[dw - 0.3, i === 0 ? 1.05 : 1.45, 0.012]} />
          </mesh>
        ))}
        {[0.75, -0.55].map((y, i) => (
          <mesh key={`i${i}`} position={[0, y, 0.037]} material={wood}>
            <boxGeometry args={[dw - 0.38, i === 0 ? 0.97 : 1.37, 0.008]} />
          </mesh>
        ))}
        <mesh position={[-side * (dw / 2 - 0.12), 0.05, 0.06]} material={brass}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>
      </group>
    </group>
  )
}

function Body({ st }: { st: WardrobeState }) {
  const light = useRef<THREE.PointLight>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const l = ease(Math.min(1, st.open * 1.4))
    if (light.current) light.current.intensity = l * 6
    if (glow.current) glow.current.opacity = l * 0.9
  })
  return (
    <>
      <mesh position={[0, 0, -D / 2 + T / 2]} material={inside}>
        <boxGeometry args={[W, H, T]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - T / 2), 0, 0]} material={wood}>
          <boxGeometry args={[T, H, D]} />
        </mesh>
      ))}
      <mesh position={[0, -H / 2 + T / 2, 0]} material={wood}>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      <mesh position={[0, H / 2 - T / 2, 0]} material={wood}>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      <RoundedBox args={[W + 0.16, 0.12, D + 0.14]} radius={0.03} position={[0, H / 2 + 0.06, 0.02]} material={woodDark} />
      <RoundedBox args={[W + 0.08, 0.1, D + 0.08]} radius={0.02} position={[0, -H / 2 - 0.05, 0.02]} material={woodDark} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.08), -H / 2 - 0.16, sz * (D / 2 - 0.1)]} material={woodDark}>
            <cylinderGeometry args={[0.035, 0.025, 0.14, 10]} />
          </mesh>
        )),
      )}
      <pointLight ref={light} position={[0, 1.35, 0.25]} color="#ffd59a" intensity={0} distance={4.5} decay={1.5} />
      <mesh position={[0, H / 2 - T - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.4, 0.06]} />
        <meshBasicMaterial ref={glow} color="#fff1d6" transparent opacity={0} />
      </mesh>
      <mesh position={[0, RAIL_Y + 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
        <cylinderGeometry args={[0.018, 0.018, W - T * 2, 12]} />
      </mesh>
      <Door side={-1} st={st} />
      <Door side={1} st={st} />
    </>
  )
}

/* ---------- Kamera ---------- */

function CameraRig({ st }: { st: WardrobeState }) {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const fit = (w: number, h: number) => Math.max(w / 2 / (tanH * aspect), h / 2 / tanH)
    const z0 = fit(3.2, 4.2) + D / 2
    const z1 = fit(2.35, 3.35) + D / 2 - 0.1
    const d = ease(st.dolly)
    // Scroll bremsen / folgen
    st.scroll += (st.target - st.scroll) * 0.12
    camera.position.set(0, 0.1 + d * 0.05, z0 + (z1 - z0) * d)
    look.set(0, 0.05, 0)
    camera.lookAt(look)
  })
  return null
}

/* ---------- Szene ---------- */

interface Props {
  items: Item[]
  st: WardrobeState
  selected: string | null
  onTap: (it: Item | null) => void
  dragged: React.RefObject<boolean>
  onReady?: () => void
}

function Contents({ items, st, selected, onTap, dragged }: Props) {
  const texOf = useTextures(items)
  const { size } = useThree()
  // Hochformat: Teile größer, damit der Schrank gefüllt wirkt
  const k = size.width < size.height ? 1.45 : 1
  const sp = S * k, fsp = FS * k
  const hanging = useMemo(
    () => items.filter((i) => HANG.includes(i.category)).sort((a, b) => HANG.indexOf(a.category) - HANG.indexOf(b.category)),
    [items],
  )
  const floor = useMemo(
    () => items.filter((i) => FLOOR.includes(i.category)).sort((a, b) => FLOOR.indexOf(a.category) - FLOOR.indexOf(b.category)),
    [items],
  )
  const left = -IW + 0.15 + sp / 2
  const maxHang = Math.max(0, (hanging.length - 1) * sp - (2 * IW - 0.3 - sp))
  const maxFloor = Math.max(0, (floor.length - 1) * fsp - (2 * IW - 0.3 - fsp))
  st.max = Math.max(maxHang, maxFloor)
  // unten so verschieben, dass beide Reihen gemeinsam ans Ende kommen
  const floorRatio = maxFloor && st.max ? maxFloor / st.max : 1

  return (
    <>
      {hanging.map((it, i) => {
        const tex = texOf(it)
        if (!tex) return null
        return (
          <Piece key={it.id} item={it} tex={tex} baseX={left + i * sp} y={RAIL_Y} h={(heightOf[it.category] ?? 1) * k}
            hanging phase={i * 1.7} st={st} selected={selected} onTap={onTap} dragged={dragged} spacing={sp} />
        )
      })}
        {floor.map((it, i) => {
          const tex = texOf(it)
          if (!tex) return null
          const h = (floorH[it.category] ?? 0.2) * k
          return (
            <Piece key={it.id} item={it} tex={tex} baseX={left + i * fsp} spacing={fsp} y={-H / 2 + T + h / 2 + 0.02} h={h}
              hanging={false} phase={i} st={st} selected={selected} onTap={onTap} dragged={dragged} ratio={floorRatio} />
          )
        })}
    </>
  )
}

export default function WardrobeCanvas(props: Props) {
  return (
    <Canvas
      className="webgl"
      dpr={tier === 'high' ? [1, 1.75] : [1, 1.5]}
      camera={{ position: [0, 0.1, 9], fov: 40, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.onTap(null)}
      onCreated={() => requestAnimationFrame(() => props.onReady?.())}
    >
      <ambientLight intensity={0.6} color="#ffe9cc" />
      <directionalLight position={[-3, 4, 5]} intensity={1.5} color="#fff3e0" />
      <directionalLight position={[4, 1, 3]} intensity={0.45} color="#f0c9a0" />
      <CameraRig st={props.st} />
      <Body st={props.st} />
      <Contents {...props} />
      <ContactShadows position={[0, -H / 2 - 0.23, 0]} scale={7} blur={2.6} opacity={0.6} far={2} resolution={256} color="#0d0704" />
    </Canvas>
  )
}
