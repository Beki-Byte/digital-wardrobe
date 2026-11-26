import * as THREE from 'three'

/* Stoff-Shader: Teil hängt oben fest, unten schwingt es.
 * Mit Textur (deine Fotos) oder Volltonfarbe. */

export const clothVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  uniform float uPhase;
  uniform float uPush;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float hang = 1.0 - uv.y;
    float h2 = hang * hang;
    float t = uTime * 1.25 + uPhase;
    p.x += (sin(t) * 0.035 + uPush * 0.12) * uSway * h2;
    p.z += sin(uv.x * 5.0 + t * 1.6) * 0.018 * hang + cos(uv.y * 8.0 + t) * 0.014 * hang;
    vShade = 0.9 + 0.1 * sin(uv.x * 16.0 + sin(uv.y * 3.0 + t) * 1.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

export const clothFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;
  uniform float uDim;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.35) discard;
    vec3 col = tex.rgb * vShade;
    col *= mix(0.35, 1.08, uLight) * mix(1.0, 0.35, uDim);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function clothUniforms(map: THREE.Texture, phase: number) {
  return {
    uTime: { value: 0 },
    uSway: { value: 1 },
    uPhase: { value: phase },
    uPush: { value: 0 },
    uMap: { value: map },
    uLight: { value: 0 },
    uDim: { value: 0 },
  }
}
