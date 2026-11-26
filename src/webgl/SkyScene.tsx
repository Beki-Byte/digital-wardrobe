import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { tier } from '../lib/quality'

/* Vollbild-Himmel hinter „Heute“: kalt (Morgen) → warm (Nachmittag),
 * Wolken aus Rauschen, je nach Wetter Regen oder Schnee, feines Korn. */

const frag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec3 uCold;
  uniform vec3 uWarm;
  uniform float uRain;
  uniform float uSnow;
  uniform float uCloud;
  uniform vec2 uMouse;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float t = uTime;

    // Grundton: dunkles Walnuss, oben links kalt, unten rechts warm
    vec3 base = vec3(0.07, 0.05, 0.04);
    float diag = smoothstep(-0.2, 1.2, uv.x * 0.6 + (1.0 - uv.y) * 0.9);
    vec3 col = base;
    col += uCold * 0.55 * smoothstep(0.9, 0.0, length(p - vec2(-0.45, 0.55) - uMouse * 0.03));
    col += uWarm * 0.5 * smoothstep(1.0, 0.0, length(p - vec2(0.5, -0.4) + uMouse * 0.03));
    col = mix(col, col * 0.85, diag * 0.3);

    // Wolken
    float c = fbm(p * 1.6 + vec2(t * 0.02, t * 0.005));
    c = smoothstep(0.45, 0.85, c) * uCloud;
    col = mix(col, col + vec3(0.18, 0.16, 0.15), c * 0.5);

    // Regen: schräge Striche
    if (uRain > 0.01) {
      vec2 r = vec2(uv.x * 80.0 + uv.y * 12.0, uv.y * 3.0 + t * 2.2);
      float id = floor(r.x);
      float drop = step(0.92, hash(vec2(id, floor(r.y + hash(vec2(id)) * 10.0))));
      float streak = drop * smoothstep(0.0, 0.5, fract(r.y + hash(vec2(id)) * 10.0)) * smoothstep(0.1, 0.0, abs(fract(r.x) - 0.5) - 0.02);
      col += vec3(0.5, 0.6, 0.7) * streak * 0.25 * uRain;
    }
    // Schnee: weiche Punkte
    if (uSnow > 0.01) {
      for (int k = 0; k < 3; k++) {
        float s = float(k) + 1.0;
        vec2 q = uv * vec2(uRes.x / uRes.y, 1.0) * (6.0 + s * 4.0) + vec2(sin(t * 0.3 + s) * 0.5, t * (0.25 + s * 0.08));
        vec2 g = fract(q) - 0.5;
        float h = hash(floor(q) + s);
        col += vec3(0.9) * smoothstep(0.08, 0.0, length(g + (h - 0.5) * 0.6)) * step(0.6, h) * 0.35 * uSnow;
      }
    }
    // Korn + Vignette
    col += (hash(uv * uRes + t) - 0.5) * 0.035;
    col *= smoothstep(1.25, 0.35, length(p));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

/** Temperatur → Farbe */
export function tempColor(t: number): THREE.Color {
  const stops: [number, string][] = [[-8, '#3f6fb0'], [2, '#6f93bf'], [10, '#8fae9c'], [17, '#d8b277'], [25, '#e57a55'], [32, '#d4473a']]
  if (t <= stops[0][0]) return new THREE.Color(stops[0][1])
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i]
      return new THREE.Color(ca).lerp(new THREE.Color(cb), (t - a) / (b - a))
    }
  }
  return new THREE.Color(stops[stops.length - 1][1])
}

function Sky({ min, max, rain, snow, cloud }: { min: number; max: number; rain: number; snow: number; cloud: number }) {
  const { size } = useThree()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCold: { value: tempColor(min) },
      uWarm: { value: tempColor(max) },
      uRain: { value: rain },
      uSnow: { value: snow },
      uCloud: { value: cloud },
      uMouse: { value: new THREE.Vector2() },
    }),
    [min, max, rain, snow, cloud],
  )
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uRes.value.set(size.width, size.height)
    uniforms.uMouse.value.lerp(s.pointer, 0.03)
  })
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vert} fragmentShader={frag} depthWrite={false} />
    </mesh>
  )
}

export default function SkyCanvas(props: { min: number; max: number; rain: number; snow: number; cloud: number }) {
  return (
    <Canvas className="sky" dpr={tier === 'high' ? [1, 1.25] : 0.75} gl={{ antialias: false, powerPreference: 'low-power' }} frameloop="always">
      <Sky {...props} />
    </Canvas>
  )
}
