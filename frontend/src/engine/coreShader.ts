/**
 * The Apprentice "signal core": a noise-displaced sphere with a fresnel rim.
 * Shared by the landing scene (ApprenticeCore) and the console orb (OrbRenderer)
 * so the agent looks the same everywhere.
 * Uniforms: uTime (s), uEnergy (0..1+), uColor (vec3).
 */
export const CORE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    float n = noise(normal * 2.2 + vec3(uTime * 0.35));
    n += 0.5 * noise(normal * 4.6 - vec3(uTime * 0.5));
    vNoise = n;
    vec3 displaced = position + normal * (n - 0.6) * (0.08 + 0.1 * uEnergy);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const CORE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEnergy;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;

  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    vec3 deep = vec3(0.02, 0.03, 0.015);
    vec3 band = uColor * smoothstep(0.55, 1.2, vNoise) * 0.55;
    vec3 col = deep + band + uColor * fres * (1.05 + 1.0 * uEnergy);
    gl_FragColor = vec4(col, 1.0);
  }
`;
