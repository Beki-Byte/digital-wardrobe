import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, RoundedBox } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scene } from '../lib/smooth-scroll'
import { tier } from '../lib/quality'

/* ------------------------------------------------------------------
 * Der Schrank: Korpus, zwei Türen mit Scharnier, Innenlicht,
 * Kleiderstange mit Bügeln und Stoff-Kleidern (Vertex-Shader).
 * Gesteuert über scene.progress (Scroll) und scene.mouseX/Y.
 * ------------------------------------------------------------------ */

const W = 2.4, H = 3.2, D = 1.0, T = 0.06
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
const range = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)))

const wood = new THREE.MeshStandardMaterial({ color: '#9a6a48', roughness: 0.55, metalness: 0.02 })
const woodDark = new THREE.MeshStandardMaterial({ color: '#7d5236', roughness: 0.6 })
const inside = new THREE.MeshStandardMaterial({ color: '#d9c2a0', roughness: 0.9 })
const brass = new THREE.MeshStandardMaterial({ color: '#d6a95a', roughness: 0.25, metalness: 0.9 })
const chrome = new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.2, metalness: 1 })

/* ---------- Silhouetten als Alpha-Masken ---------- */

type Shape = 'shirt' | 'dress' | 'blouse' | 'coat' | 'skirt'

function silhouette(shape: Shape): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const x = c.getContext('2d')!
  x.fillStyle = '#fff'
  x.beginPath()
  const P = (pts: number[][]) => {
    x.moveTo(pts[0][0], pts[0][1])
    for (const [a, b] of pts.slice(1)) x.lineTo(a, b)
    x.closePath()
  }
  if (shape === 'shirt') P([[96, 10], [160, 10], [250, 70], [228, 150], [196, 128], [200, 330], [56, 330], [60, 128], [28, 150], [6, 70]])
  if (shape === 'blouse') P([[100, 10], [156, 10], [244, 80], [236, 260], [206, 262], [196, 120], [204, 380], [52, 380], [60, 120], [50, 262], [20, 260], [12, 80]])
  if (shape === 'dress') P([[98, 10], [158, 10], [182, 60], [176, 170], [248, 500], [8, 500], [80, 170], [74, 60]])
  if (shape === 'coat') P([[90, 10], [166, 10], [248, 70], [252, 330], [222, 330], [212, 140], [218, 470], [38, 470], [44, 140], [34, 330], [4, 330], [8, 70]])
  if (shape === 'skirt') P([[70, 20], [186, 20], [240, 300], [16, 300]])
  x.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

const clothVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  uniform float uPhase;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float hang = 1.0 - uv.y;               // oben fest, unten frei
    float h2 = hang * hang;
    float t = uTime * 1.3 + uPhase;
    // Pendeln + Stoffwellen
    p.x += (sin(t) * 0.05 + uMouse.x * 0.08) * uSway * h2;
    p.z += sin(uv.x * 6.0 + t * 1.7) * 0.025 * hang + cos(uv.y * 9.0 + t) * 0.02 * hang;
    p.z += uMouse.y * 0.06 * h2 * uSway;
    vShade = 0.86 + 0.14 * sin(uv.x * 22.0 + sin(uv.y * 4.0 + t) * 2.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const clothFragment = /* glsl */ `
  uniform sampler2D uMask;
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uPattern;
  uniform float uLight;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    float a = texture2D(uMask, vUv).r;
    if (a < 0.5) discard;
    vec3 col = uColor;
    // optionales Muster: Punkte oder Streifen
    if (uPattern > 0.5 && uPattern < 1.5) {
      vec2 g = fract(vUv * vec2(9.0, 18.0)) - 0.5;
      col = mix(col, uColor2, smoothstep(0.16, 0.12, length(g)));
    } else if (uPattern > 1.5) {
      col = mix(col, uColor2, step(0.5, fract(vUv.x * 10.0)));
    }
    float top = smoothstep(0.0, 0.35, 1.0 - vUv.y);
    col *= vShade * mix(0.9, 1.0, top);
    col *= mix(0.45, 1.25, uLight) * (0.92 + 0.1 * (1.0 - vUv.y));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

interface GarmentProps {
  x: number
  shape: Shape
  color: string
  color2?: string
  pattern?: 0 | 1 | 2
  w: number
  h: number
  phase: number
  z?: number
}

function Garment({ x, shape, color, color2 = '#ffffff', pattern = 0, w, h, phase, z = 0 }: GarmentProps) {
  const seg = tier === 'high' ? 24 : 12
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSway: { value: 1 },
      uPhase: { value: phase },
      uMouse: { value: new THREE.Vector2() },
      uMask: { value: silhouette(shape) },
      uColor: { value: new THREE.Color(color) },
      uColor2: { value: new THREE.Color(color2) },
      uPattern: { value: pattern },
      uLight: { value: 0 },
    }),
    [shape, color, color2, pattern, phase],
  )
  useFrame((st) => {
    uniforms.uTime.value = st.clock.elapsedTime
    uniforms.uMouse.value.set(scene.mouseX, scene.mouseY)
    uniforms.uLight.value = ease(range(scene.progress, 0.05, 0.4))
    uniforms.uSway.value = 0.6 + ease(range(scene.progress, 0.1, 0.5)) * 0.8
  })
  return (
    <group position={[x, 1.2, z]}>
      {/* Bügel */}
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, 0]} material={chrome}>
        <torusGeometry args={[0.035, 0.008, 6, 16, Math.PI * 1.4]} />
      </mesh>
      <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]} material={woodDark}>
        <cylinderGeometry args={[0.012, 0.012, w * 0.95, 8]} />
      </mesh>
      <mesh position={[0, -0.06 - h / 2, 0]}>
        <planeGeometry args={[w, h, seg, seg * 2]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={clothVertex}
          fragmentShader={clothFragment}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function Door({ side }: { side: -1 | 1 }) {
  const ref = useRef<THREE.Group>(null)
  const dw = W / 2 - 0.01
  useFrame(() => {
    // Türen: erst kurz "anlehnen", dann aufschwingen
    const p = scene.progress
    const open = ease(range(p, 0.02, 0.42)) * 1.95 + Math.sin(performance.now() / 900) * 0.008 * (1 - range(p, 0, 0.05))
    if (ref.current) ref.current.rotation.y = side === -1 ? -open : open
  })
  return (
    <group ref={ref} position={[side * (W / 2), 0, D / 2 + 0.03]}>
      <group position={[-side * (dw / 2), 0, 0]}>
        <RoundedBox args={[dw, H - 0.2, 0.05]} radius={0.015} smoothness={3} material={wood} />
        {/* Kassetten */}
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
        {/* Griff */}
        <mesh position={[-side * (dw / 2 - 0.12), 0.05, 0.06]} material={brass}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>
      </group>
    </group>
  )
}

function Wardrobe() {
  const light = useRef<THREE.PointLight>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const l = ease(range(scene.progress, 0.08, 0.38))
    if (light.current) light.current.intensity = l * 6
    if (glow.current) glow.current.opacity = l * 0.9
  })
  return (
    <group position={[0, 0, 0]}>
      {/* Korpus */}
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
      {/* Krone und Sockel */}
      <RoundedBox args={[W + 0.16, 0.12, D + 0.14]} radius={0.03} position={[0, H / 2 + 0.06, 0.02]} material={woodDark} />
      <RoundedBox args={[W + 0.08, 0.1, D + 0.08]} radius={0.02} position={[0, -H / 2 - 0.05, 0.02]} material={woodDark} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.08), -H / 2 - 0.16, sz * (D / 2 - 0.1)]} material={woodDark}>
            <cylinderGeometry args={[0.035, 0.025, 0.14, 10]} />
          </mesh>
        )),
      )}
      {/* Innenlicht */}
      <pointLight ref={light} position={[0, 1.35, 0.15]} color="#ffd59a" intensity={0} distance={4.5} decay={1.6} />
      <mesh position={[0, H / 2 - T - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.4, 0.06]} />
        <meshBasicMaterial ref={glow} color="#fff1d6" transparent opacity={0} />
      </mesh>
      {/* Stange */}
      <mesh position={[0, 1.25, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
        <cylinderGeometry args={[0.018, 0.018, W - T * 2, 12]} />
      </mesh>
      {/* Kleider */}
      <Garment x={-0.82} shape="coat" color="#6f4b37" w={0.5} h={1.55} phase={0.0} z={-0.05} />
      <Garment x={-0.42} shape="blouse" color="#f2e6d0" color2="#c77d6d" pattern={1} w={0.44} h={1.0} phase={1.1} z={0.04} />
      <Garment x={-0.02} shape="dress" color="#21463a" w={0.48} h={1.7} phase={2.3} />
      <Garment x={0.4} shape="shirt" color="#8fb0cf" color2="#f4efe6" pattern={2} w={0.46} h={0.85} phase={3.4} z={0.05} />
      <Garment x={0.8} shape="dress" color="#d79a8c" w={0.42} h={1.35} phase={4.2} z={-0.03} />
      {/* Regal mit gefalteten Sachen */}
      <mesh position={[0, -0.95, 0.02]} material={wood}>
        <boxGeometry args={[W - T * 2, 0.04, D - 0.1]} />
      </mesh>
      {[
        [-0.75, '#e8dcc6', 3], [-0.25, '#3c5a7a', 2], [0.25, '#c9a24a', 3], [0.72, '#efc8be', 2],
      ].map(([x, c, n]) =>
        Array.from({ length: n as number }, (_, i) => (
          <RoundedBox key={`${x}-${i}`} args={[0.4, 0.07, 0.36]} radius={0.025} position={[x as number, -0.89 + i * 0.075, 0]}>
            <meshStandardMaterial color={c as string} roughness={0.95} />
          </RoundedBox>
        )),
      )}
      {/* Schuhe */}
      {[-0.55, -0.32, 0.38, 0.6].map((x, i) => (
        <RoundedBox key={x} args={[0.16, 0.1, 0.34]} radius={0.04} position={[x, -H / 2 + T + 0.05, 0.08]}>
          <meshStandardMaterial color={i < 2 ? '#2b2420' : '#f1ece3'} roughness={0.6} />
        </RoundedBox>
      ))}
      <Door side={-1} />
      <Door side={1} />
    </group>
  )
}

function CameraRig() {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const p = scene.progress
    const narrow = size.width < size.height
    const z0 = narrow ? 11 : 7.6
    const z1 = narrow ? 7.4 : 3.4
    const dolly = ease(range(p, 0.35, 1))
    const tx = scene.mouseX * 0.35 * (1 - dolly * 0.5)
    const ty = 0.25 + scene.mouseY * 0.2 + dolly * 0.35
    camera.position.x += (tx - camera.position.x) * 0.06
    camera.position.y += (ty - camera.position.y) * 0.06
    camera.position.z += (z0 + (z1 - z0) * dolly - camera.position.z) * 0.08
    look.set(0, 0.15 + dolly * 0.3, 0)
    camera.lookAt(look)
  })
  return null
}

export default function WardrobeCanvas({ active }: { active: boolean }) {
  return (
    <Canvas
      className="webgl"
      dpr={tier === 'high' ? [1, 1.75] : [1, 1.25]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0.4, 9], fov: 34, near: 0.1, far: 40 }}
      gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.55} color="#ffe9cc" />
      <directionalLight position={[-3, 4, 5]} intensity={1.6} color="#fff3e0" />
      <directionalLight position={[4, 1, 3]} intensity={0.5} color="#f0c9a0" />
      <CameraRig />
      <Wardrobe />
      <ContactShadows position={[0, -H / 2 - 0.23, 0]} scale={7} blur={2.6} opacity={0.55} far={2} resolution={tier === 'high' ? 512 : 256} color="#120a06" />
    </Canvas>
  )
}
